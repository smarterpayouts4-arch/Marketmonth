/**
 * URL → crawl → evidence → CSV → Brand Core → topics, with a provenance grade
 * at every hop. Answers one question: can each generated topic be traced back
 * to text that actually exists on the customer's website?
 *
 * Read-only by default: DATABASE_URL is cleared so analyzeWebsite takes its
 * in-memory persist path and the approved fixture CSV is never touched.
 * Pass --persist to exercise the real Neon draft write instead.
 *
 * Usage:
 *   npm run trace:url-to-topics
 *   npm run trace:url-to-topics -- --url example.com --objective product_education
 *   npm run trace:url-to-topics -- --persist
 */
import { config } from "dotenv";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

config({ path: ".env.local" });
config({ path: ".env" });

import type { MarketingFocus } from "../src/brain/content/marketing-focus";
import { parseFixtureCsv } from "../src/brain/content/repository/parse-fixture-csv";
import type { ContentBrainContext } from "../src/brain/content/types";
import { compileBrandCore } from "../src/brain/core/compile-brand-core";
import { generateTopicCandidates } from "../src/brain/evaluation/generate-topic-candidates";
import { preferBrandCoreForTopics } from "../src/brain/evaluation/prefer-brand-core-context";
import type { TopicCandidate } from "../src/brain/evaluation/topic-candidate-types";
import { analyzeWebsite } from "../src/engine/discovery/analyze-website";
import { getCompanyDiscoveryConfig } from "../src/engine/discovery/company-discovery-config";
import { normalizeWebsiteUrl } from "../src/engine/discovery/normalize-url";
import { buildDiscoveryCsvDocument } from "../src/lib/company-profile/csv-contract";
import type { DiscoveryEvidence } from "../src/lib/discovery/evidence.schema";

const OBJECTIVES: MarketingFocus[] = [
  "brand_awareness",
  "value_proposition",
  "product_education",
  "decision_support",
  "trust_authority",
];

type Args = {
  url: string;
  objectives: MarketingFocus[];
  persist: boolean;
  /** Force the deterministic rules path so no field comes from an LLM. */
  noLlm: boolean;
};

function parseArgs(argv: string[]): Args {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const objective = get("--objective");
  return {
    url: get("--url") ?? "zynava.com",
    objectives: objective
      ? [objective as MarketingFocus]
      : OBJECTIVES,
    persist: argv.includes("--persist"),
    noLlm: argv.includes("--no-llm"),
  };
}

/** Lowercase, strip punctuation, collapse whitespace — for verbatim matching. */
function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

// ---------------------------------------------------------------------------
// Layer-1 snapshots = what the crawler actually read from the site this run
// ---------------------------------------------------------------------------

type Snapshot = {
  pageId: string;
  url: string;
  kind: string;
  cleanedText: string;
  title: string;
  collectionMethod: string;
  retrievedAt: string;
};

function companySlug(companyId: string): string {
  return companyId
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .replace(/[^a-z0-9._-]+/g, "_");
}

function readSnapshots(companyId: string, since: number): Snapshot[] {
  const dir = path.join(
    process.cwd(),
    "data",
    "runtime",
    "discovery-pages",
    companySlug(companyId)
  );
  let files: string[];
  try {
    files = readdirSync(dir).filter(
      (f) => f.endsWith(".json") && f !== "manifest.json"
    );
  } catch {
    return [];
  }
  const out: Snapshot[] = [];
  for (const file of files) {
    try {
      const snap = JSON.parse(
        readFileSync(path.join(dir, file), "utf8")
      ) as Snapshot;
      if (Date.parse(snap.retrievedAt) >= since) out.push(snap);
    } catch {
      /* skip unreadable snapshot */
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Grading
// ---------------------------------------------------------------------------

type Corpus = {
  /** Cleaned page text + page titles, lowercased and space-collapsed. */
  normalized: string;
  /** Same text with every non-alphanumeric removed — survives reformatting. */
  collapsed: string;
};

type Grounding = {
  field: string;
  value: string;
  sourceUrl: string;
  sourceUrlWasCrawled: boolean;
  verbatimOnSite: boolean;
};

function collapseAlnum(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

/**
 * A value counts as on-site if its text appears in the crawled pages either
 * as normalized words or with all separators removed. The collapsed form
 * matters because extractors reformat phone numbers, addresses and headings.
 */
function checkGrounding(
  field: string,
  value: string,
  sourceUrl: string,
  corpus: Corpus,
  crawledUrls: Set<string>
): Grounding {
  const normalized = normalizeText(value);
  const probe =
    normalized.length > 160 ? normalized.slice(0, 160) : normalized;
  const collapsedProbe = collapseAlnum(probe);
  const verbatimOnSite =
    (probe.length >= 3 && corpus.normalized.includes(probe)) ||
    (collapsedProbe.length >= 3 && corpus.collapsed.includes(collapsedProbe));

  return {
    field,
    value: value.length > 120 ? `${value.slice(0, 119)}…` : value,
    sourceUrl,
    sourceUrlWasCrawled: crawledUrls.has(sourceUrl.replace(/\/$/, "")),
    verbatimOnSite,
  };
}

function gradeEvidence(
  evidence: DiscoveryEvidence[],
  corpus: Corpus,
  crawledUrls: Set<string>
) {
  const byKind: Record<string, number> = {};
  const observedGrounded: Grounding[] = [];
  const observedUngrounded: Grounding[] = [];
  let withSourceUrl = 0;

  for (const ev of evidence) {
    byKind[ev.kind] = (byKind[ev.kind] ?? 0) + 1;
    if (ev.sourceUrl) withSourceUrl += 1;
    if (ev.kind !== "observed") continue;
    const g = checkGrounding(
      ev.field,
      ev.value,
      ev.sourceUrl ?? "",
      corpus,
      crawledUrls
    );
    (g.verbatimOnSite ? observedGrounded : observedUngrounded).push(g);
  }

  const observedTotal = observedGrounded.length + observedUngrounded.length;
  return {
    total: evidence.length,
    byKind,
    withSourceUrlPct: pct(withSourceUrl, evidence.length),
    observedTotal,
    observedVerbatimPct: pct(observedGrounded.length, observedTotal),
    ungroundedObservedFields: [
      ...new Set(observedUngrounded.map((g) => g.field)),
    ],
    ungroundedObservedSample: observedUngrounded.slice(0, 10),
  };
}

/** Fields the CSV writes vs fields parseFixtureCsv actually reads back. */
function gradeCsvRoundTrip(
  csvText: string,
  parsed: ContentBrainContext | null
) {
  const lines = csvText.trim().split("\n");
  const byRecordType: Record<string, number> = {};
  const writtenFields = new Set<string>();
  for (const line of lines.slice(1)) {
    const cells = line.split('","').map((c) => c.replace(/^"|"$/g, ""));
    const recordType = cells[0] ?? "";
    const field = cells[1] ?? "";
    byRecordType[recordType] = (byRecordType[recordType] ?? 0) + 1;
    if (recordType === "brand_profile" && field) writtenFields.add(field);
  }

  const readBack: Record<string, boolean> = parsed
    ? {
        businessName: Boolean(parsed.brandName),
        website: Boolean(parsed.website),
        description: Boolean(parsed.description),
        audience: Boolean(parsed.audience),
        products: (parsed.products ?? []).length > 0,
        services: (parsed.services ?? []).length > 0,
        indexedProducts: (parsed.indexedProducts ?? []).length > 0,
        valueProposition: Boolean(parsed.valueProposition),
        brandVoice: Boolean(parsed.brandVoice),
        marketingOpportunity: Boolean(parsed.marketingOpportunity),
        "seo.contentOpportunities": (parsed.contentOpportunities ?? []).length > 0,
      }
    : {};

  const neverRead = [...writtenFields].filter(
    (f) => !(f in readBack) && f !== "schemaVersion"
  );

  const evidenceLoaded = parsed
    ? Object.keys(parsed.evidenceById ?? {}).length
    : 0;

  return {
    rowCount: lines.length - 1,
    byRecordType,
    parsedOk: Boolean(parsed),
    evidenceLoaded,
    /** Rows the Brain treats as evidence that were not crawl evidence rows. */
    promotedToEvidence: evidenceLoaded - (byRecordType.evidence ?? 0),
    readBack,
    writeOnlyColumns: neverRead,
  };
}

type CandidateTrace = {
  rank: number;
  title: string;
  subjectLabel: string;
  subjectKind: string;
  evidenceCount: number;
  evidenceSourceUrls: string[];
  subjectOnSite: boolean;
  evidenceOnSite: boolean;
  templateScaffold: string;
};

/** Title minus the subject label = the reusable English scaffolding. */
function scaffoldOf(title: string, subjectLabel: string): string {
  const normalizedLabel = subjectLabel.trim();
  if (!normalizedLabel) return title;
  return title
    .replace(new RegExp(escapeRegExp(normalizedLabel), "ig"), "{subject}")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function traceCandidate(
  candidate: TopicCandidate,
  context: ContentBrainContext,
  corpus: Corpus
): CandidateTrace {
  const evidence = candidate.evidenceIds
    .map((id) => context.evidenceById?.[id])
    .filter(Boolean);
  const sourceUrls = [
    ...new Set(evidence.map((ev) => ev!.sourceUrl).filter(Boolean)),
  ];
  const subjectNormalized = normalizeText(candidate.subject.label);
  const evidenceOnSite = evidence.some((ev) => {
    const probe = normalizeText(ev!.value).slice(0, 120);
    return (
      (probe.length >= 3 && corpus.normalized.includes(probe)) ||
      (collapseAlnum(probe).length >= 3 &&
        corpus.collapsed.includes(collapseAlnum(probe)))
    );
  });

  return {
    rank: candidate.rank,
    title: candidate.title,
    subjectLabel: candidate.subject.label,
    subjectKind: candidate.subjectKind,
    evidenceCount: candidate.evidenceIds.length,
    evidenceSourceUrls: sourceUrls as string[],
    subjectOnSite:
      (subjectNormalized.length >= 3 &&
        corpus.normalized.includes(subjectNormalized)) ||
      (collapseAlnum(subjectNormalized).length >= 3 &&
        corpus.collapsed.includes(collapseAlnum(subjectNormalized))),
    evidenceOnSite,
    templateScaffold: scaffoldOf(candidate.title, candidate.subject.label),
  };
}

// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const normalizedUrl = normalizeWebsiteUrl(args.url);
  const host = new URL(normalizedUrl).hostname.replace(/^www\./, "");

  if (!args.persist) {
    // Read-only: forces analyzeWebsite onto its in-memory persist path.
    delete process.env.DATABASE_URL;
  }
  if (args.noLlm) {
    delete process.env.OPENAI_API_KEY;
  }
  const derivedFieldSource =
    args.noLlm || !process.env.OPENAI_API_KEY
      ? "rules (site-derived only)"
      : `llm (${process.env.OPENAI_DISCOVERY_MODEL || "gpt-5.4-nano"})`;

  console.log(`\n=== URL → TOPICS TRACE — ${normalizedUrl} ===`);
  console.log(
    `mode: ${args.persist ? "PERSIST (writes Neon draft)" : "read-only (no DB write)"}`
  );
  console.log(`derived fields: ${derivedFieldSource}\n`);

  const startedAt = Date.now();
  const stageTimings: Record<string, number> = {};
  let stageStart = Date.now();

  const analysis = await analyzeWebsite({
    url: normalizedUrl,
    onStage: (id, status) => {
      if (status === "active") {
        stageStart = Date.now();
        console.log(`  [stage] ${id} …`);
      } else {
        stageTimings[id] = Date.now() - stageStart;
        console.log(`  [stage] ${id} done (${stageTimings[id]}ms)`);
      }
    },
  });

  const snapshots = readSnapshots(host, startedAt);
  const corpusRaw = snapshots
    .map((s) => `${s.title}\n${s.cleanedText}`)
    .join("\n");
  const corpus: Corpus = {
    normalized: normalizeText(corpusRaw),
    collapsed: collapseAlnum(corpusRaw),
  };
  const crawledUrls = new Set(
    snapshots.map((s) => s.url.replace(/\/$/, ""))
  );

  // Stage 1 — collection
  const collection = {
    pagesCollected: snapshots.length,
    pageKinds: snapshots.reduce<Record<string, number>>((acc, s) => {
      acc[s.kind] = (acc[s.kind] ?? 0) + 1;
      return acc;
    }, {}),
    collectionMethods: snapshots.reduce<Record<string, number>>((acc, s) => {
      acc[s.collectionMethod] = (acc[s.collectionMethod] ?? 0) + 1;
      return acc;
    }, {}),
    cleanedTextChars: snapshots.reduce(
      (sum, s) => sum + s.cleanedText.length,
      0
    ),
    urls: snapshots.map((s) => s.url),
    hardcodedExtraUrlsFired:
      getCompanyDiscoveryConfig(normalizedUrl).extraSeedUrls.length > 0,
  };

  // Stage 2 — evidence provenance
  const evidence = analysis.evidence ?? [];
  const evidenceGrade = gradeEvidence(evidence, corpus, crawledUrls);

  // Stage 3 — CSV materialize + round trip
  const retrievedAt = new Date().toISOString();
  const csvText = buildDiscoveryCsvDocument({
    profile: analysis.brandProfile,
    evidence,
    crawlMeta: null,
    sourceUrl: normalizedUrl,
    retrievedAt,
    notes: "trace-url-to-topics (not an approved publish)",
  });
  const parsedContext = parseFixtureCsv(csvText);
  const csvGrade = gradeCsvRoundTrip(csvText, parsedContext);

  if (!parsedContext) {
    console.error("\nCSV did not parse back into a context — stopping.");
    process.exitCode = 2;
    return;
  }

  // Stage 4 — Brand Core
  const brandCore = compileBrandCore(parsedContext);
  const brandCoreGrade = {
    offers: brandCore.offers.length,
    indexedProducts: (brandCore.indexed_products ?? []).length,
    proofLibrary: brandCore.proof_library.length,
    audienceSegments: brandCore.audience.segments.length,
    indexedProductsOnSite: (brandCore.indexed_products ?? []).filter((p) =>
      corpus.normalized.includes(normalizeText(p.name))
    ).length,
  };

  // Stage 5 — topics
  const topicContext = preferBrandCoreForTopics(parsedContext, brandCore);
  const byObjective: Record<string, unknown> = {};
  const allTraces: CandidateTrace[] = [];

  for (const objective of args.objectives) {
    const result = generateTopicCandidates({
      context: topicContext,
      objective,
      includeIndustryResearch: false,
    });
    if (result.status !== "success") {
      byObjective[objective] = {
        status: result.status,
        diagnostic: result.diagnostic,
        candidates: [],
      };
      continue;
    }
    const traces = result.candidates.map((c) =>
      traceCandidate(c, topicContext, corpus)
    );
    allTraces.push(...traces);
    byObjective[objective] = {
      status: result.status,
      completeness: result.completeness,
      candidates: traces,
    };
  }

  const scaffoldCounts = allTraces.reduce<Record<string, number>>((acc, t) => {
    acc[t.templateScaffold] = (acc[t.templateScaffold] ?? 0) + 1;
    return acc;
  }, {});

  const topicGrade = {
    candidateTotal: allTraces.length,
    withEvidencePct: pct(
      allTraces.filter((t) => t.evidenceCount > 0).length,
      allTraces.length
    ),
    subjectOnSitePct: pct(
      allTraces.filter((t) => t.subjectOnSite).length,
      allTraces.length
    ),
    evidenceOnSitePct: pct(
      allTraces.filter((t) => t.evidenceOnSite).length,
      allTraces.length
    ),
    fullyTraceablePct: pct(
      allTraces.filter(
        (t) => t.evidenceCount > 0 && t.subjectOnSite && t.evidenceOnSite
      ).length,
      allTraces.length
    ),
    distinctScaffolds: Object.keys(scaffoldCounts).length,
    scaffoldReuse: scaffoldCounts,
  };

  const report = {
    url: normalizedUrl,
    mode: args.persist ? "persist" : "read-only",
    derivedFieldSource,
    startedAt: new Date(startedAt).toISOString(),
    durationMs: Date.now() - startedAt,
    stageTimings,
    analysisId: analysis.analysisId,
    collection,
    evidence: evidenceGrade,
    csv: csvGrade,
    brandCore: brandCoreGrade,
    topics: topicGrade,
    byObjective,
  };

  const outDir = path.join(
    process.cwd(),
    "data",
    "runtime",
    "url-to-topics-trace"
  );
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date(startedAt).toISOString().replace(/[:.]/g, "-");
  const jsonPath = path.join(outDir, `${companySlug(host)}-${stamp}.json`);
  const csvPath = path.join(outDir, `${companySlug(host)}-${stamp}.trace.csv`);
  writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");
  writeFileSync(csvPath, csvText, "utf8");

  // ---- console summary -----------------------------------------------------
  console.log("\n--- 1. COLLECTION ---");
  console.log(
    `pages ${collection.pagesCollected} | text ${collection.cleanedTextChars} chars | kinds ${JSON.stringify(collection.pageKinds)}`
  );
  console.log(`methods ${JSON.stringify(collection.collectionMethods)}`);
  console.log(
    `site-specific extra URLs hardcoded for this host: ${collection.hardcodedExtraUrlsFired}`
  );

  console.log("\n--- 2. EVIDENCE PROVENANCE ---");
  console.log(
    `${evidenceGrade.total} rows | kinds ${JSON.stringify(evidenceGrade.byKind)}`
  );
  console.log(`with source_url: ${evidenceGrade.withSourceUrlPct}%`);
  console.log(
    `observed evidence found verbatim on the crawled pages: ${evidenceGrade.observedVerbatimPct}% (${evidenceGrade.observedTotal} observed rows)`
  );
  if (evidenceGrade.ungroundedObservedFields.length > 0) {
    console.log(
      `fields marked observed but not found on site: ${evidenceGrade.ungroundedObservedFields.join(", ")}`
    );
  }

  console.log("\n--- 3. CSV ---");
  console.log(
    `${csvGrade.rowCount} rows ${JSON.stringify(csvGrade.byRecordType)}`
  );
  console.log(
    `evidence the Brain sees: ${csvGrade.evidenceLoaded} (${csvGrade.promotedToEvidence} of them are brand_profile rows promoted to evidence, not crawl evidence)`
  );
  console.log(
    `brand_profile fields written but never read: ${csvGrade.writeOnlyColumns.join(", ") || "none"}`
  );

  console.log("\n--- 4. BRAND CORE ---");
  console.log(JSON.stringify(brandCoreGrade));

  console.log("\n--- 5. TOPICS ---");
  console.log(
    `${topicGrade.candidateTotal} candidates | with evidence ${topicGrade.withEvidencePct}% | subject on site ${topicGrade.subjectOnSitePct}% | evidence text on site ${topicGrade.evidenceOnSitePct}%`
  );
  console.log(`fully traceable to the website: ${topicGrade.fullyTraceablePct}%`);
  console.log(
    `distinct title scaffolds: ${topicGrade.distinctScaffolds} across ${topicGrade.candidateTotal} titles`
  );
  for (const t of allTraces) {
    const flag = t.subjectOnSite && t.evidenceCount > 0 ? "ok  " : "WEAK";
    console.log(
      `  ${flag} [${t.subjectKind}] ${t.title}\n        subject="${t.subjectLabel}" evidence=${t.evidenceCount} urls=${t.evidenceSourceUrls.join(" ") || "none"}`
    );
  }

  console.log(`\nreport: ${jsonPath}`);
  console.log(`csv:    ${csvPath}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
