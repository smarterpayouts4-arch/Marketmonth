/**
 * Final E2E verification for Discovery CSV Quality Upgrade.
 * Produces artifacts under data/runtime/discovery-reconcile/e2e-verify-<ts>/
 *
 * Usage: npx tsx scripts/e2e-discovery-quality-verify.ts
 */
import { config } from "dotenv";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

config({ path: ".env.local" });
config({ path: ".env" });

import { and, eq } from "drizzle-orm";

import { getBrandCore } from "../src/brain/core/get-brand-core";
import { classifyContextSubjects } from "../src/brain/evaluation/subjects/classify";
import { generateTopicCandidates } from "../src/brain/evaluation/generate-topic-candidates";
import { evaluateDiscoveryAcceptance } from "../src/engine/discovery/acceptance-gate";
import { analyzeWebsite } from "../src/engine/discovery/analyze-website";
import {
  descriptionHasChrome,
  isGenericAudience,
  isGenericValueProposition,
} from "../src/engine/discovery/build-profile-from-corpus/derive-narrative";
import { buildZynavaReconciliationReport } from "../src/engine/discovery/reconcile/build-report";
import {
  corpusFromFrozenPages,
  loadFrozenCorpus,
} from "../src/engine/discovery/reconcile/frozen-corpus";
import { getDb } from "../src/db";
import {
  brandProfiles,
  brands,
  users,
  websiteAnalyses,
} from "../src/db/schema";
import { DISCOVERY_CSV_SCHEMA_VERSION } from "../src/lib/company-profile/csv-contract";
import { companyArtifactPaths } from "../src/lib/company-profile/company-paths";
import { csvRowsToObjects, parseCsv } from "../src/lib/dev/parse-csv";
import {
  DEV_USER_EMAIL,
  DEV_ZYNAVA_BRAND_KEY,
  ZYNAVA_WEBSITE,
} from "../src/lib/dev/zynava-constants";
import { parseFixtureCsv } from "../src/brain/content/repository/parse-fixture-csv";
import type { ContentBrainContext } from "../src/brain/content/types";

const PLATFORM_NOUNS =
  /\b(search|comparison|compare|builder|advisor|filter|engine|tool|explorer|finder|quiz|platform)\b/i;

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function writeJson(dir: string, name: string, value: unknown) {
  const p = join(dir, name);
  writeFileSync(p, JSON.stringify(value, null, 2), "utf8");
  return p;
}

function fieldRows(csvPath: string, field: string) {
  const objects = csvRowsToObjects(parseCsv(readFileSync(csvPath, "utf8")));
  return objects.filter(
    (r) =>
      (r.record_type === "brand_profile" || r.record_type === "evidence") &&
      r.field === field
  );
}

function brandField(csvPath: string, field: string): string {
  const rows = fieldRows(csvPath, field);
  const brand = rows.find((r) => r.record_type === "brand_profile");
  return brand?.value ?? "";
}

async function main() {
  const started = new Date().toISOString();
  const paths = companyArtifactPaths("zynava.com");
  const outDir = join(
    process.cwd(),
    "data",
    "runtime",
    "discovery-reconcile",
    `e2e-verify-${started.replace(/[:.]/g, "-")}`
  );
  mkdirSync(outDir, { recursive: true });

  const report: Record<string, unknown> = {
    started,
    outDir,
    steps: [] as Array<Record<string, unknown>>,
  };
  const step = (name: string, data: Record<string, unknown>) => {
    (report.steps as Array<Record<string, unknown>>).push({ name, ...data });
    console.log(`\n=== ${name} ===`);
    console.log(JSON.stringify(data, null, 2).slice(0, 4000));
  };

  // Snapshot previous approved CSV for comparison B
  const prevCsv = join(outDir, "previous-approved.csv");
  if (existsSync(paths.approvedCsv)) {
    copyFileSync(paths.approvedCsv, prevCsv);
  } else if (existsSync("data/companies/zynava.com/baseline-2026-07-28.csv")) {
    copyFileSync("data/companies/zynava.com/baseline-2026-07-28.csv", prevCsv);
  }

  // --- 3/4 Fresh Analyze (force refresh) ---
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL required for E2E verify");
  }

  console.log("Running analyzeWebsite(forceRefresh)…");
  const analysis = await analyzeWebsite({
    url: ZYNAVA_WEBSITE,
    forceRefresh: true,
  });

  const db = getDb();
  const [analysisRow] = await db
    .select()
    .from(websiteAnalyses)
    .where(eq(websiteAnalyses.id, analysis.analysisId))
    .limit(1);
  const crawlMeta = (analysisRow?.crawlMeta ?? {}) as Record<string, unknown>;

  const snapshotsDir = join(
    process.cwd(),
    "data",
    "runtime",
    "discovery-pages",
    "zynava.com"
  );
  const hasSnapshots =
    existsSync(snapshotsDir) &&
    existsSync(join(snapshotsDir, "manifest.json"));

  const approvedBeforeHash = existsSync(paths.approvedCsv)
    ? sha256(readFileSync(paths.approvedCsv, "utf8"))
    : null;

  step("analyze_draft", {
    analysisId: analysis.analysisId,
    brandProfileId: analysis.brandProfileId,
    pageCount: analysis.pageCount,
    businessName: analysis.brandProfile.businessName,
    catalogCount: analysis.brandProfile.indexedProducts?.length ?? 0,
    servicesCount: analysis.brandProfile.services?.length ?? 0,
    descriptionPreview: (analysis.brandProfile.description ?? "").slice(0, 160),
    audiencePreview: (analysis.brandProfile.audience ?? "").slice(0, 120),
    layer1SnapshotsPresent: hasSnapshots,
    crawlTelemetry: {
      failedUrls: crawlMeta.failedUrls ?? null,
      fetchAttempts: crawlMeta.fetchAttempts ?? null,
      extraPageFailures: crawlMeta.extraPageFailures ?? null,
      collectionMethods: crawlMeta.collectionMethods ?? null,
      pageCount: crawlMeta.pageCount ?? null,
      kinds: crawlMeta.kinds ?? null,
      csvSchemaVersion: crawlMeta.csvSchemaVersion ?? null,
      acceptanceGate: crawlMeta.acceptanceGate ?? null,
    },
    approvedCsvUnchangedAfterAnalyze:
      approvedBeforeHash === null
        ? null
        : approvedBeforeHash === sha256(readFileSync(paths.approvedCsv, "utf8")),
  });
  const draftEvidence = analysis.evidence ?? [];
  writeJson(outDir, "crawl-telemetry.json", crawlMeta);
  writeJson(outDir, "analyze-draft-profile.json", {
    brandProfile: analysis.brandProfile,
    evidence: draftEvidence,
    brandProfileId: analysis.brandProfileId,
    analysisId: analysis.analysisId,
  });

  // Gate on draft corpus from crawl meta summaries
  const frozen = loadFrozenCorpus(paths.frozenCorpusDir);
  const corpus =
    "pages" in frozen && frozen.pages.length > 0
      ? corpusFromFrozenPages(frozen.pages)
      : {
          normalizedUrl: ZYNAVA_WEBSITE,
          origin: "https://zynava.com",
          pages: ((crawlMeta.pageSummaries as Array<{
            url: string;
            pageType: string;
            title?: string;
          }>) ?? []).map((s) => ({
            url: s.url,
            status: 200,
            html: "<html></html>",
            title: s.title ?? "",
            kind: s.pageType as "home",
            collectionMethod: "fetch" as const,
          })),
        };

  const gate = evaluateDiscoveryAcceptance({
    profile: analysis.brandProfile,
    evidence: draftEvidence,
    corpus,
  });
  writeJson(outDir, "gate-report.json", gate);
  step("gate_report", {
    status: gate.status,
    accepted: gate.accepted,
    approvalReady: gate.approvalReady,
    scores: gate.scores,
    supportedClaimsRatio: gate.supportedClaimsRatio,
    pageCoverage: gate.pageCoverage,
    genericLanguageScore: gate.genericLanguageScore,
    contradictionCount: gate.contradictionCount,
    failures: gate.failures,
    warnings: gate.warnings,
    diagnostics: gate.diagnostics,
  });

  // --- 6 Confirm publish blocked if not approval_ready ---
  let publishBlockedCorrectly = false;
  let publishRan = false;
  let publishError: string | null = null;

  if (!gate.approvalReady) {
    // Invoke publish script logic expectation: should fail without --skip-gate
    try {
      const { spawnSync } = await import("node:child_process");
      const r = spawnSync(
        "npx",
        ["tsx", "scripts/publish-company-profile.ts"],
        {
          cwd: process.cwd(),
          encoding: "utf8",
          env: process.env,
          shell: true,
        }
      );
      publishBlockedCorrectly = r.status !== 0;
      publishError = (r.stderr || r.stdout || "").slice(0, 800);
      step("publish_blocked_when_not_ready", {
        exitCode: r.status,
        publishBlockedCorrectly,
        output: publishError,
      });
    } catch (e) {
      publishError = e instanceof Error ? e.message : String(e);
      step("publish_blocked_when_not_ready", {
        error: publishError,
        publishBlockedCorrectly: false,
      });
    }
  } else {
    // Link draft profile to owned Zynava brand (devKey / website fallback)
    let ownedId: string | null = null;
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, DEV_USER_EMAIL))
        .limit(1);
      if (user) {
        const [owned] = await db
          .select()
          .from(brands)
          .where(
            and(
              eq(brands.devKey, DEV_ZYNAVA_BRAND_KEY),
              eq(brands.userId, user.id)
            )
          )
          .limit(1);
        ownedId = owned?.id ?? null;
      }
    } catch {
      // legacy users schema on shared Neon
    }
    if (!ownedId) {
      const [byKey] = await db
        .select()
        .from(brands)
        .where(eq(brands.devKey, DEV_ZYNAVA_BRAND_KEY))
        .limit(1);
      ownedId = byKey?.id ?? null;
    }
    if (!ownedId) {
      const [bySite] = await db
        .select()
        .from(brands)
        .where(eq(brands.website, ZYNAVA_WEBSITE))
        .limit(1);
      ownedId = bySite?.id ?? null;
    }
    if (ownedId) {
      await db
        .update(brandProfiles)
        .set({ brandId: ownedId })
        .where(eq(brandProfiles.id, analysis.brandProfileId));
    }

    const hashBefore = existsSync(paths.approvedCsv)
      ? sha256(readFileSync(paths.approvedCsv, "utf8"))
      : null;

    const { spawnSync } = await import("node:child_process");
    const r = spawnSync("npx", ["tsx", "scripts/publish-company-profile.ts", "--force"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: process.env,
      shell: true,
    });
    publishRan = r.status === 0;
    step("publish_materialize", {
      exitCode: r.status,
      stdout: (r.stdout || "").slice(0, 2000),
      stderr: (r.stderr || "").slice(0, 1000),
      publishRan,
    });

    // Unchanged hash behavior (second publish without --force)
    const r2 = spawnSync("npx", ["tsx", "scripts/publish-company-profile.ts"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: process.env,
      shell: true,
    });
    step("publish_hash_skip", {
      exitCode: r2.status,
      stdout: (r2.stdout || "").slice(0, 1200),
      notes: "Second publish should skip materialize when hash unchanged",
    });

    const hashAfter = existsSync(paths.approvedCsv)
      ? sha256(readFileSync(paths.approvedCsv, "utf8"))
      : null;
    step("csv_promotion_safety", {
      schemaVersion: DISCOVERY_CSV_SCHEMA_VERSION,
      hashBefore,
      hashAfter,
      csvChanged: hashBefore !== hashAfter,
      publishMetaExists: existsSync(paths.neonPublishMeta),
      publishMeta: existsSync(paths.neonPublishMeta)
        ? JSON.parse(readFileSync(paths.neonPublishMeta, "utf8"))
        : null,
    });
  }

  // --- CSV field dump ---
  const csvPath = paths.approvedCsv;
  const csvExists = existsSync(csvPath);
  const csvFields = csvExists
    ? {
        businessName: brandField(csvPath, "businessName"),
        website: brandField(csvPath, "website"),
        description: brandField(csvPath, "description"),
        audience: brandField(csvPath, "audience"),
        valueProposition: brandField(csvPath, "valueProposition"),
        services: brandField(csvPath, "services"),
        products: brandField(csvPath, "products"),
        indexedProducts: brandField(csvPath, "indexedProducts"),
        differentiators: brandField(csvPath, "differentiators"),
        customerProblems: brandField(csvPath, "customerProblems"),
        legalName: brandField(csvPath, "legalName"),
        socialProfiles: brandField(csvPath, "socialProfiles"),
        contactEmails: brandField(csvPath, "contactEmails"),
        contactPhones: brandField(csvPath, "contactPhones"),
        faqs: fieldRows(csvPath, "faq").map((r) => ({
          value: r.value,
          source_url: r.source_url,
          evidence_type: r.evidence_type,
          confidence: r.confidence,
          source_snippet: r.source_snippet,
        })),
        evidenceNarrative: [
          "description",
          "audience",
          "valueProposition",
          "services",
          "differentiators",
          "customerProblems",
        ].map((f) => {
          const rows = fieldRows(csvPath, f);
          return {
            field: f,
            brandValue: brandField(csvPath, f),
            rows: rows.map((r) => ({
              record_type: r.record_type,
              evidence_type: r.evidence_type,
              confidence: r.confidence,
              source_url: r.source_url,
              source_snippet: r.source_snippet,
              notes: r.notes,
              valuePreview: r.value.slice(0, 240),
            })),
          };
        }),
      }
    : null;
  writeJson(outDir, "approved-csv-fields.json", csvFields);

  // Explicit checks
  let catalog: Array<{ name: string; sourceUrl?: string }> = [];
  try {
    catalog = JSON.parse(csvFields?.indexedProducts || "[]");
  } catch {
    catalog = [];
  }
  const catalogNames = catalog.map((c) => c.name.toLowerCase());
  const explicit = {
    descriptionNoChrome: csvFields
      ? !descriptionHasChrome(csvFields.description)
      : false,
    audienceNotGeneric: csvFields
      ? !isGenericAudience(csvFields.audience)
      : false,
    vpCompanySpecific: csvFields
      ? Boolean(csvFields.valueProposition?.trim()) &&
        !isGenericValueProposition(csvFields.valueProposition)
      : false,
    servicesNonEmpty: Boolean(
      csvFields?.services && csvFields.services !== "[]" && csvFields.services.length > 2
    ),
    faqsNotGlued: (csvFields?.faqs ?? []).every(
      (f) =>
        !/How It WorksContact|What is .*?\?What /i.test(f.value) &&
        !/how we work\./i.test(f.value)
    ),
    calciumPresent: catalogNames.some((n) => n.includes("calcium")),
    omega3Present: catalogNames.some((n) => /omega/.test(n)),
    creatinePresent: catalogNames.some((n) => n.includes("creatine")),
    allCatalogHaveSource: catalog.every((c) => Boolean(c.sourceUrl?.trim())),
    platformNotInCatalog: catalog.every((c) => !PLATFORM_NOUNS.test(c.name)),
    noInventedObvious: catalog.every(
      (c) => !/super juice|miracle|guaranteed/i.test(c.name)
    ),
  };
  writeJson(outDir, "explicit-checks.json", explicit);
  step("explicit_checks", explicit);

  // --- Frozen parity ---
  const reconcile = buildZynavaReconciliationReport({
    approvedCsvPath: csvPath,
    frozenCorpusDir: paths.frozenCorpusDir,
  });
  writeJson(outDir, "reconciliation-report.json", reconcile);
  const parityMd = join(outDir, "parity-report.md");
  // render if available via report fields
  writeFileSync(
    parityMd,
    `# Parity / reconcile\n\n\`\`\`json\n${JSON.stringify(
      {
        unresolvedObservedContradictions:
          reconcile.unresolvedObservedContradictions,
        catalogExplanations: reconcile.catalogExplanations?.slice?.(0, 20),
        diagnostics: reconcile.diagnostics?.slice?.(0, 30),
      },
      null,
      2
    )}\n\`\`\`\n`,
    "utf8"
  );

  // --- Brand Core ---
  let brandCoreOut: Record<string, unknown> | null = null;
  if (csvExists) {
    const core = getBrandCore("zynava.com", { absolutePath: csvPath });
    const subjects = classifyContextSubjects(core.context);
    brandCoreOut = {
      identity: core.identity,
      brand_name: core.brandCore.brand_name,
      domain: core.brandCore.domain,
      audience: core.brandCore.audience,
      positioning: core.brandCore.positioning,
      voice: core.brandCore.voice,
      offers: core.brandCore.offers,
      proof_library: core.brandCore.proof_library,
      faqProofs: core.brandCore.proof_library.filter((p) => p.type === "faq"),
      subjects: subjects.map((s) => ({
        kind: s.kind,
        label: s.label,
        sourceField: s.sourceField,
      })),
      indexedProducts: core.context.indexedProducts,
      products: core.context.products,
      services: core.context.services,
      contentOpportunities: core.context.contentOpportunities,
    };
    writeJson(outDir, "brand-core.json", brandCoreOut);

    // Idea Lab bypass audit
    const bypassNotes = [
      "Idea Lab load-and-parse uses parseFixtureCsv → getBrandCore (CSV path).",
      "Deterministic topic strategies still read TopicSubject from ContentBrainContext via classifyContextSubjects — dual-brain residual.",
      "generateTopicCandidates uses context + subjects, not BrandCore slice exclusively.",
    ];
    writeJson(outDir, "idea-lab-bypass-audit.json", { notes: bypassNotes });

    // Controlled comparison A/B/C
    const minimal: ContentBrainContext = {
      ...core.context,
      description: "A company website",
      audience: "Customers",
      valueProposition: "Help customers",
      services: [],
      indexedProducts: [],
      products: [],
      contentOpportunities: [],
      evidenceById: {},
    };

    function scoreLab(label: string, ctx: ContentBrainContext) {
      const subs = classifyContextSubjects(ctx);
      const result = generateTopicCandidates({
        context: ctx,
        objective: "product_education",
      });
      const titles = (result.candidates ?? []).map((c) => c.title);
      const kinds = (result.candidates ?? []).map((c) => c.subjectKind);
      const trust = generateTopicCandidates({
        context: ctx,
        objective: "trust_proof",
      });
      const trustKinds = (trust.candidates ?? []).map((c) => c.subjectKind);
      return {
        label,
        status: result.status,
        candidateCount: result.candidates?.length ?? 0,
        titles,
        subjectKinds: kinds,
        hasCatalogTopic: kinds.includes("catalog_product"),
        hasFaqTopic:
          kinds.includes("faq_topic") ||
          trustKinds.includes("faq_topic") ||
          kinds.includes("audience_problem") ||
          trustKinds.includes("audience_problem") ||
          trustKinds.includes("trust_method"),
        hasDifferentiatorTopic:
          kinds.includes("brand_position") ||
          trustKinds.includes("brand_position") ||
          /differentiat|compare|transparent|non-sponsored/i.test(
            [...titles, ...(trust.candidates ?? []).map((c) => c.title)].join(
              " "
            )
          ),
        subjectsSample: subs.slice(0, 12).map((s) => `${s.kind}:${s.label}`),
        trustTitles: (trust.candidates ?? []).map((c) => c.title),
      };
    }

    let prevCtx: ContentBrainContext | null = null;
    if (existsSync(prevCsv)) {
      try {
        prevCtx = parseFixtureCsv(readFileSync(prevCsv, "utf8"));
      } catch {
        prevCtx = null;
      }
    }

    const comparison = {
      A_minimal: scoreLab("A_minimal", minimal),
      B_previous: prevCtx
        ? scoreLab("B_previous", prevCtx)
        : { label: "B_previous", error: "previous CSV unavailable" },
      C_new: scoreLab("C_new", core.context),
    };
    writeJson(outDir, "idea-lab-comparison.json", comparison);
    step("idea_lab_comparison", comparison as Record<string, unknown>);
  }

  // Owned brand publish pointer (tolerant of legacy users schema)
  let publishedPointer: string | null = null;
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, DEV_USER_EMAIL))
      .limit(1);
    if (user) {
      const [owned] = await db
        .select()
        .from(brands)
        .where(
          and(
            eq(brands.devKey, DEV_ZYNAVA_BRAND_KEY),
            eq(brands.userId, user.id)
          )
        )
        .limit(1);
      publishedPointer = owned?.publishedBrandProfileId ?? null;
    }
  } catch {
    // ignore
  }
  if (!publishedPointer) {
    const [byKey] = await db
      .select()
      .from(brands)
      .where(eq(brands.devKey, DEV_ZYNAVA_BRAND_KEY))
      .limit(1);
    publishedPointer = byKey?.publishedBrandProfileId ?? null;
  }

  const decision = (() => {
    const blockers: string[] = [];
    if (!hasSnapshots) blockers.push("Layer-1 snapshots missing");
    if (!crawlMeta.acceptanceGate) blockers.push("gate diagnostics missing on crawlMeta");
    if (approvedBeforeHash && !gate.approvalReady) {
      // publish may be blocked — CONDITIONAL if draft quality weak
    }
    if (gate.approvalReady && !publishRan && !publishBlockedCorrectly) {
      // expected publish
      if (!existsSync(paths.neonPublishMeta)) blockers.push("publish meta missing after approval_ready");
    }
    if (!explicit.calciumPresent || !explicit.omega3Present || !explicit.creatinePresent) {
      blockers.push("catalog missing Calcium/Omega-3/Creatine");
    }
    if (!explicit.descriptionNoChrome) blockers.push("description chrome");
    if (!explicit.audienceNotGeneric) blockers.push("generic audience");
    if (!explicit.faqsNotGlued) blockers.push("FAQ contamination");
    if (!explicit.allCatalogHaveSource) blockers.push("catalog missing sourceUrl");

    if (blockers.length === 0 && gate.approvalReady && publishRan) return "GO";
    if (blockers.some((b) => /chrome|generic|FAQ|catalog missing Calcium/.test(b))) {
      return { decision: "NO-GO", blockers };
    }
    if (blockers.length > 0) return { decision: "CONDITIONAL GO", blockers };
    if (!gate.approvalReady) {
      return {
        decision: "CONDITIONAL GO",
        blockers: [
          "draft not approval_ready — publish correctly blocked; CSV not refreshed from this draft",
          ...blockers,
        ],
      };
    }
    return { decision: "CONDITIONAL GO", blockers };
  })();

  const final = {
    started,
    finished: new Date().toISOString(),
    outDir,
    gate,
    explicit,
    publishedPointer,
    publishRan,
    publishBlockedCorrectly,
    decision,
    artifactPaths: {
      gateReport: join(outDir, "gate-report.json"),
      crawlTelemetry: join(outDir, "crawl-telemetry.json"),
      parityReport: parityMd,
      reconciliationReport: join(outDir, "reconciliation-report.json"),
      approvedCsv: paths.approvedCsv,
      brandCore: join(outDir, "brand-core.json"),
      ideaLabComparison: join(outDir, "idea-lab-comparison.json"),
      publishMeta: paths.neonPublishMeta,
      masterReport: join(outDir, "master-report.json"),
    },
  };
  writeJson(outDir, "master-report.json", { ...report, ...final });
  console.log("\n===== FINAL DECISION =====");
  console.log(JSON.stringify(decision, null, 2));
  console.log("Artifacts:", outDir);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
