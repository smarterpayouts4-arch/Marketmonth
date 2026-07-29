/**
 * TEMPORARY baseline probe — delete after the topic generator rebuild.
 *
 * Read-only. Loads an approved company CSV straight off disk (no crawl, no
 * network, no writes) and runs the real topic generator for every objective so
 * we can see exactly what comes out today.
 *
 * Usage:
 *   npx tsx scripts/tmp-topic-baseline.ts
 *   npx tsx scripts/tmp-topic-baseline.ts --company clearflow.example
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  TOPIC_CATEGORY_IDS,
  type TopicCategoryId,
} from "../src/brain/content/topic-category";
import { parseFixtureCsv } from "../src/brain/content/repository/parse-fixture-csv";
import { compileBrandCore } from "../src/brain/core/compile-brand-core";
import { generateTopicCandidates } from "../src/brain/evaluation/generate-topic-candidates";
import { preferBrandCoreForTopics } from "../src/brain/evaluation/prefer-brand-core-context";

function arg(flag: string, fallback: string): string {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? (process.argv[i + 1] ?? fallback) : fallback;
}

const companyId = arg("--company", "zynava.com");
const csvPath = path.join(
  process.cwd(),
  "data",
  "companies",
  companyId,
  "approved.csv"
);

const csvText = readFileSync(csvPath, "utf8");
const context = parseFixtureCsv(csvText);
if (!context) {
  console.error(`Could not parse ${csvPath} into a context.`);
  process.exit(2);
}

const brandCore = compileBrandCore(context);
const topicContext = preferBrandCoreForTopics(context, brandCore);

// ---------------------------------------------------------------------------
// What the generator actually has to work with
// ---------------------------------------------------------------------------

const evidence = Object.values(topicContext.evidenceById);
const byField = new Map<string, number>();
for (const ev of evidence) {
  byField.set(ev.field, (byField.get(ev.field) ?? 0) + 1);
}
const withEvidenceType = evidence.filter((ev) => Boolean(ev.evidenceType));

// Offer rows live in the CSV but are dropped before the context is built, so
// read them straight from the file to show what the extraction mislabeled.
const offerRows = csvText
  .trim()
  .split("\n")
  .slice(1)
  .filter((line) => /^"?offer"?,/.test(line.trim()));

console.log("=".repeat(78));
console.log(`INPUT — ${companyId}`);
console.log("=".repeat(78));
console.log(`brandName            ${topicContext.brandName}`);
console.log(`audience             ${topicContext.audience ?? "(none)"}`);
console.log(`valueProposition     ${topicContext.valueProposition ?? "(none)"}`);
console.log(`products             ${topicContext.products.length}`);
console.log(`services             ${topicContext.services.length}`);
console.log(`indexedProducts      ${topicContext.indexedProducts.length}`);
console.log(`contentOpportunities ${topicContext.contentOpportunities.length}`);
console.log(`evidence rows        ${evidence.length}`);
console.log(
  `  with evidenceType  ${withEvidenceType.length} of ${evidence.length}`
);
console.log(
  `  by field           ${[...byField.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([f, n]) => `${f}:${n}`)
    .join("  ")}`
);
console.log(`brandCore.offers     ${brandCore.offers.length}`);
console.log(`brandCore.proofs     ${brandCore.proof_library.length}`);
console.log(`CSV "offer" rows     ${offerRows.length}`);
for (const row of offerRows) {
  console.log(`  ${row.slice(0, 110)}`);
}

// ---------------------------------------------------------------------------
// What comes out today, per objective
// ---------------------------------------------------------------------------

for (const objective of TOPIC_CATEGORY_IDS as readonly TopicCategoryId[]) {
  console.log("");
  console.log("-".repeat(78));
  console.log(`OBJECTIVE — ${objective}`);
  console.log("-".repeat(78));

  const result = generateTopicCandidates({
    context: topicContext,
    objective,
    includeIndustryResearch: false,
  });

  if (result.status !== "success") {
    console.log(`status      ${result.status}`);
    console.log(`code        ${result.diagnostic?.code ?? "(none)"}`);
    console.log(`message     ${result.diagnostic?.message ?? "(none)"}`);
    continue;
  }

  console.log(
    `status      success / ${result.completeness}  (${result.candidates.length} candidates)`
  );
  if (result.warnings.length > 0) {
    console.log(
      `warnings    ${result.warnings.map((w) => w.code).join(", ")}`
    );
  }

  for (const c of result.candidates) {
    console.log("");
    console.log(`  ${c.rank}. ${c.title}`);
    console.log(`     score        ${c.score.overall}`);
    console.log(
      `     subject      "${c.subject.label}"  [${c.subjectKind}, ${c.classificationConfidence}]`
    );
    console.log(
      `     evidenceIds  ${c.evidenceIds.length > 0 ? c.evidenceIds.join(", ") : "(NONE)"}`
    );
    console.log(`     angle        ${c.strategicAngle}`);
    console.log(`     itchType     ${c.titleItchType ?? "(none)"}`);
    for (const id of c.evidenceIds) {
      const ev = topicContext.evidenceById[id];
      console.log(
        `       ${id} → ${ev ? `"${ev.value.slice(0, 84)}"` : "UNRESOLVED"}`
      );
    }
  }
}

console.log("");
