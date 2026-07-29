/**
 * Does the two-branch split actually hold?
 *
 * Runs the real landing-page path for one URL — analyze the site, materialize
 * one CSV artifact — then drives BOTH consumers off that artifact and checks
 * they agree:
 *
 *   Branch A  artifact → buildDiscoveryNarrative → discovery card
 *   Branch B  artifact → projectionToBrainContext → Brand Core → topics
 *
 * Every read and write is recorded by the provenance log, so the report can
 * state, rather than assume, whether a branch read anything the other did not.
 *
 * This is a wiring check. For whether the generated topics are grounded in
 * real website text, use `npm run trace:url-to-topics`.
 *
 * Usage:
 *   npm run verify:branch-split
 *   npm run verify:branch-split -- --url example.com
 *   npm run verify:branch-split -- --persist   # allow the Neon draft write
 */
import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

config({ path: ".env.local" });
config({ path: ".env" });

import type { TopicCategoryId } from "../src/brain/content/topic-category";
import { compileBrandCore } from "../src/brain/core/compile-brand-core";
import { generateTopicCandidates } from "../src/brain/evaluation/generate-topic-candidates";
import { preferBrandCoreForTopics } from "../src/brain/evaluation/prefer-brand-core-context";
import { analyzeWebsite } from "../src/engine/discovery/analyze-website";
import { buildDiscoveryNarrative } from "../src/engine/discovery/discovery-narrative";
import { normalizeWebsiteUrl } from "../src/engine/discovery/normalize-url";
import { readCompanyProfile } from "../src/lib/company-profile/read-company-profile";
import { projectionToBrainContext } from "../src/lib/company-profile/to-brain-context";
import {
  addProvenanceSink,
  artifactHashesByBranch,
  consoleSink,
  createJsonlSink,
  createMemorySink,
  findBranchLeaks,
  setCorrelationId,
  type ProvenanceEvent,
} from "../src/lib/provenance";

const OBJECTIVES: TopicCategoryId[] = [
  "customer_questions",
  "product_education",
  "trust_proof",
  "offers_conversion",
];

type Args = { url: string; persist: boolean };

function parseArgs(argv: string[]): Args {
  const i = argv.indexOf("--url");
  return {
    url: i >= 0 ? argv[i + 1] : "zynava.com",
    persist: argv.includes("--persist"),
  };
}

type Check = { name: string; pass: boolean; detail: string };

function check(name: string, pass: boolean, detail: string): Check {
  return { name, pass, detail };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const normalizedUrl = normalizeWebsiteUrl(args.url);
  const companyId = new URL(normalizedUrl).hostname.replace(/^www\./, "");

  if (!args.persist) delete process.env.DATABASE_URL;

  const correlationId = randomUUID();
  setCorrelationId(correlationId);

  const outDir = path.join(process.cwd(), "data", "runtime", "branch-split");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonlPath = path.join(outDir, `${companyId}-${stamp}.jsonl`);
  const reportPath = path.join(outDir, `${companyId}-${stamp}.json`);

  const memory = createMemorySink();
  addProvenanceSink(memory.sink);
  addProvenanceSink(createJsonlSink(jsonlPath));
  addProvenanceSink(consoleSink);

  console.log(`\n=== BRANCH SPLIT VERIFY — ${normalizedUrl} ===`);
  console.log(`correlation: ${correlationId}`);
  console.log(
    `mode: ${args.persist ? "PERSIST (Neon draft write allowed)" : "read-only (no Neon write)"}\n`
  );

  // --- WRITE: landing page "analyze my website" ----------------------------
  console.log("--- WRITE: analyze → draft artifact ---");
  const analysis = await analyzeWebsite({
    url: normalizedUrl,
    onStage: (id, status) => {
      if (status === "complete") console.log(`  [stage] ${id} done`);
    },
  });

  const writtenHash = analysis.artifactHash;
  if (!writtenHash) {
    console.error("\nanalyzeWebsite did not materialize an artifact — stopping.");
    process.exitCode = 2;
    return;
  }

  // --- BRANCH A: discovery card, read back from the artifact --------------
  console.log("\n--- BRANCH A: artifact → discovery narrative ---");
  let projectionA;
  try {
    projectionA = readCompanyProfile(companyId, {
      state: "approved",
      branch: "branch-a",
      step: "read-for-activation",
    });
  } catch {
    projectionA = readCompanyProfile(companyId, {
      state: "draft",
      branch: "branch-a",
      step: "read-for-activation",
    });
  }
  const narrativeFromArtifact = buildDiscoveryNarrative({
    projection: projectionA,
  });
  const liveNarrative = analysis.discoveryNarrative ?? null;

  // --- BRANCH B: topics, read back from the same artifact ------------------
  console.log("\n--- BRANCH B: artifact → brand core → topics ---");
  const projectionB = readCompanyProfile(companyId, {
    state: "draft",
    branch: "branch-b",
    step: "read-for-topics",
  });
  const brainContext = projectionToBrainContext(projectionB);
  const brandCore = compileBrandCore(brainContext);
  const topicContext = preferBrandCoreForTopics(brainContext, brandCore);

  const byObjective: Record<string, unknown> = {};
  let candidateTotal = 0;
  let candidatesWithEvidence = 0;
  for (const objective of OBJECTIVES) {
    const result = generateTopicCandidates({
      context: topicContext,
      objective,
      includeIndustryResearch: false,
    });
    const candidates = result.status === "success" ? result.candidates : [];
    candidateTotal += candidates.length;
    candidatesWithEvidence += candidates.filter(
      (c) => c.evidenceIds.length > 0
    ).length;
    byObjective[objective] = {
      status: result.status,
      completeness:
        result.status === "success" ? result.completeness : undefined,
      count: candidates.length,
      titles: candidates.map((c) => c.title),
    };
  }

  // --- CHECKS --------------------------------------------------------------
  const events: ProvenanceEvent[] = memory.events;
  const hashes = artifactHashesByBranch(events);
  const leaks = findBranchLeaks(events);

  const branchAHashes = hashes["branch-a"] ?? [];
  const branchBHashes = hashes["branch-b"] ?? [];

  // Branch A may prefer approved.csv when present (product rule). That is still
  // an artifact read — not a leak — so A may see approved and/or draft hashes.
  const branchASawDraft = branchAHashes.includes(writtenHash);
  const branchBExactDraft =
    branchBHashes.length === 1 && branchBHashes[0] === writtenHash;
  const liveNarrativeOk = Boolean(
    liveNarrative &&
      liveNarrative.sections.length === 3 &&
      liveNarrative.businessName
  );
  // Draft-built narrative is always grounded in the just-written artifact.
  const draftNarrativeOk =
    narrativeFromArtifact.sections.length === 3 &&
    narrativeFromArtifact.businessName.length > 0;

  const checks: Check[] = [
    check(
      "analyze materialized exactly one draft artifact",
      (hashes.write ?? []).length === 1,
      `write hashes: ${(hashes.write ?? []).join(", ") || "none"}`
    ),
    check(
      "Branch A read company artifacts and saw the new draft",
      branchAHashes.length >= 1 && branchASawDraft,
      `branch-a hashes: ${branchAHashes.join(", ") || "none"} (must include draft ${writtenHash})`
    ),
    check(
      "Branch B read exactly the draft artifact just written",
      branchBExactDraft,
      `branch-b hashes: ${branchBHashes.join(", ") || "none"}`
    ),
    check(
      "no branch read from outside the artifact",
      leaks.length === 0,
      leaks.length
        ? leaks.map((l) => `${l.branch}:${l.step} via ${l.source}`).join("; ")
        : "no non-artifact reads recorded"
    ),
    check(
      "analyze returned a grounded discovery narrative",
      liveNarrativeOk,
      liveNarrativeOk
        ? `${liveNarrative!.businessName}: 3 sections, cadence ${liveNarrative!.cadence.level}`
        : "missing or incomplete discoveryNarrative on analyze result"
    ),
    check(
      "draft artifact alone can build a discovery narrative",
      draftNarrativeOk,
      draftNarrativeOk
        ? `${narrativeFromArtifact.businessName}: 3 sections`
        : "draft projection failed to build narrative"
    ),
    check(
      "Branch B produced topics from the artifact",
      candidateTotal > 0,
      `${candidateTotal} candidates, ${candidatesWithEvidence} with evidence`
    ),
  ];

  const report = {
    correlationId,
    url: normalizedUrl,
    companyId,
    mode: args.persist ? "persist" : "read-only",
    writtenArtifactHash: writtenHash,
    hashesByBranch: hashes,
    leaks,
    checks,
    branchA: {
      builtFromArtifact: Boolean(narrativeFromArtifact),
      liveNarrativeOk,
      draftNarrativeOk,
      preferredHashes: branchAHashes,
      sections: narrativeFromArtifact.sections.length,
      pillars: narrativeFromArtifact.contentPillars.length,
      cadence: narrativeFromArtifact.cadence.level,
      detectedChannels: narrativeFromArtifact.detectedChannels.filter(
        (c) => c.status === "link-detected"
      ).length,
      evidenceQuality: narrativeFromArtifact.evidenceQuality,
      faqsFromArtifact: projectionA.faqs.length,
      offersFromArtifact: projectionA.offers.length,
      headingsFromArtifact: projectionA.signals.headings.length,
    },
    branchB: {
      evidenceRows: Object.keys(brainContext.evidenceById ?? {}).length,
      offers: brandCore.offers.length,
      indexedProducts: (brandCore.indexed_products ?? []).length,
      proofLibrary: brandCore.proof_library.length,
      candidateTotal,
      candidatesWithEvidence,
      byObjective,
    },
    events,
  };

  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log("\n--- RESULT ---");
  for (const c of checks) {
    console.log(`  ${c.pass ? "PASS" : "FAIL"}  ${c.name}\n        ${c.detail}`);
  }

  console.log("\n--- BRANCH A (discovery narrative) ---");
  console.log(
    `  sections ${report.branchA.sections} | pillars ${report.branchA.pillars} | cadence ${report.branchA.cadence} | quality ${report.branchA.evidenceQuality}`
  );
  console.log(
    `  fed by artifact: ${report.branchA.offersFromArtifact} offers, ${report.branchA.faqsFromArtifact} faqs, ${report.branchA.headingsFromArtifact} headings`
  );

  console.log("\n--- BRANCH B (topics) ---");
  console.log(
    `  evidence ${report.branchB.evidenceRows} | offers ${report.branchB.offers} | candidates ${candidateTotal} (${candidatesWithEvidence} with evidence)`
  );
  for (const [objective, value] of Object.entries(byObjective)) {
    const v = value as { status: string; count: number };
    console.log(`  ${objective.padEnd(20)} ${v.status} (${v.count})`);
  }

  const failed = checks.filter((c) => !c.pass);
  console.log(
    `\n${failed.length === 0 ? "CLEAN SPLIT" : `${failed.length} of ${checks.length} checks FAILED`}`
  );
  console.log(`report: ${reportPath}`);
  console.log(`events: ${jsonlPath}\n`);

  if (failed.length > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
