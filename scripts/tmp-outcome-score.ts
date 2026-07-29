/**
 * TEMPORARY probe — delete after the topic generator rebuild.
 *
 * Drives the REAL scorer and the REAL dedupe from src/ against the twelve
 * outcome pairs recovered from Zynava's approved.csv, so we can see the actual
 * ranked six before building anything.
 *
 * Nothing is simulated except the seeds themselves, which are shaped exactly as
 * extract-outcome-subjects.ts would emit them.
 *
 * Usage: npx tsx scripts/tmp-outcome-score.ts
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import type { TopicSeed } from "../src/brain/evaluation/objective-topic-strategies";
import { PREFERRED_KINDS } from "../src/brain/evaluation/gtc/preferred-kinds";
import { scoreCandidate } from "../src/brain/evaluation/gtc/score-candidate";
import {
  groundedSupportKey,
  displayIntentKey,
  selectDistinctSupportKeys,
} from "../src/brain/evaluation/gtc/support-key";
import { parseFixtureCsv } from "../src/brain/content/repository/parse-fixture-csv";

// --- recover the pairs (same structural extractor as the prototype) --------

function insertBlockBoundaries(glued: string): string[] {
  return glued
    .replace(/([a-z0-9])([A-Z])/g, "$1\n$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1\n$2")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

const DETERMINER_LED = /^(The|A|An|Your)\s+\S/;

type Pair = {
  offering: string;
  descriptor: string;
  outcome: string;
  evidenceIds: string[];
  sourceFields: string[];
};

function extractPairs(
  rows: Array<{ id: string; field: string; value: string }>
): Pair[] {
  type Raw = { offering: string; descriptor: string; id: string; field: string };
  const raw: Raw[] = [];
  for (const row of rows) {
    const segments = insertBlockBoundaries(row.value);
    for (let i = 0; i < segments.length - 1; i += 1) {
      const offering = segments[i];
      const descriptor = segments[i + 1];
      if (!offering || !descriptor) continue;
      if (offering.split(/\s+/).length > 3) continue;
      if (!/^[A-Z]/.test(offering)) continue;
      if (/[.?!,:;]$/.test(offering)) continue;
      if (!DETERMINER_LED.test(descriptor)) continue;
      if (descriptor.split(/\s+/).length > 6) continue;
      raw.push({ offering, descriptor, id: row.id, field: row.field });
    }
  }
  const trailing = new Map<string, number>();
  for (const r of raw) {
    const w = r.descriptor.split(/\s+/);
    const last = w[w.length - 1]?.toLowerCase().replace(/[^a-z]/g, "");
    if (last && last.length >= 3) trailing.set(last, (trailing.get(last) ?? 0) + 1);
  }
  const categoryNouns = new Set(
    [...trailing.entries()].filter(([, n]) => n >= 2).map(([w]) => w)
  );

  const byKey = new Map<string, Pair>();
  for (const r of raw) {
    let body = r.descriptor.split(/\s+/).slice(1);
    const last = body[body.length - 1]?.toLowerCase().replace(/[^a-z]/g, "");
    if (last && categoryNouns.has(last)) body = body.slice(0, -1);
    const outcome = body.join(" ").trim();
    if (!outcome) continue;
    const key = `${r.offering.toLowerCase()}|${outcome.toLowerCase()}`;
    const existing = byKey.get(key);
    if (existing) {
      if (!existing.evidenceIds.includes(r.id)) existing.evidenceIds.push(r.id);
      if (!existing.sourceFields.includes(r.field)) {
        existing.sourceFields.push(r.field);
      }
      continue;
    }
    byKey.set(key, {
      offering: r.offering,
      descriptor: r.descriptor,
      outcome,
      evidenceIds: [r.id],
      sourceFields: [r.field],
    });
  }
  return [...byKey.values()];
}

// --- read the CSV, including the signal rows the brain drops today ---------

const csvText = readFileSync(
  path.join(process.cwd(), "data", "companies", "zynava.com", "approved.csv"),
  "utf8"
);
const parsedContext = parseFixtureCsv(csvText);
if (!parsedContext) throw new Error("parse failed");
const context = parsedContext;

function readCells(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      cells.push(cur);
      cur = "";
    } else cur += ch;
  }
  cells.push(cur);
  return cells;
}

// Post-fix state: evidence rows plus the signal rows that become evidence
// once projectionToBrainContext carries the signals slice.
const rows: Array<{ id: string; field: string; value: string }> = [];
for (const [id, ev] of Object.entries(context.evidenceById)) {
  rows.push({ id, field: ev.field, value: ev.value });
}
for (const line of csvText.split(/\r?\n/).slice(1)) {
  if (!line.trim()) continue;
  const c = readCells(line);
  if (c[0] === "signal" && c[1] === "product_text") {
    rows.push({
      id: "ev_signal_producttext",
      field: "signal.product_text",
      value: c[2] ?? "",
    });
  }
}

const pairs = extractPairs(rows);

// --- shape them as TopicSeeds exactly as the extractor would ---------------

const audience =
  context.audience ?? "Shoppers comparing supplements before buying";

function titleFor(p: Pair): string {
  return `${p.offering} is labelled "${p.descriptor}" — what that wording means`;
}

const seeds: TopicSeed[] = pairs.map((p) => ({
  subject: p.offering,
  subjectType: "health_outcome" as never,
  audienceNeed: audience,
  evidenceIds: p.evidenceIds,
  sourceFields: p.sourceFields,
  classificationReason: `Brand label pairs ${p.offering} with "${p.descriptor}"`,
  classificationConfidence: "high",
  frameHint: "outcome_label_deconstruction",
  sourceType: "brand_observed",
}));

// --- run the REAL scorer in both configurations ----------------------------

function runScenario(label: string, registered: boolean) {
  const original = [...PREFERRED_KINDS.product_education];
  if (registered) {
    PREFERRED_KINDS.product_education = [
      "health_outcome" as never,
      ...original,
    ];
  } else {
    PREFERRED_KINDS.product_education = original;
  }

  const scored = seeds
    .map((seed, i) => {
      const title = titleFor(pairs[i]!);
      return {
        seed,
        title,
        pair: pairs[i]!,
        score: scoreCandidate({
          title,
          seed,
          objective: "product_education",
          context,
          recentKeys: new Set<string>(),
          audience,
        }),
      };
    })
    .sort((a, b) => b.score.overall - a.score.overall);

  console.log("");
  console.log("=".repeat(78));
  console.log(label);
  console.log("=".repeat(78));
  console.log(
    "      score  align  kind  ctx  aud   ev  spec  clar  candidate"
  );
  for (const s of scored) {
    console.log(
      `  ${s.score.overall.toFixed(2)}   ${s.score.objectiveAlignment.toFixed(2)}  ${s.score.subjectKindFit.toFixed(2)}  ${s.score.contextGrounding.toFixed(2)}  ${s.score.audienceRelevance.toFixed(2)}  ${s.score.evidenceGrounding.toFixed(2)}  ${s.score.specificity.toFixed(2)}  ${s.score.clarity.toFixed(2)}  ${s.pair.offering} -> ${s.pair.outcome}`
    );
  }

  // real dedupe
  const kept = selectDistinctSupportKeys(scored, 6);
  console.log("");
  console.log(`  after selectDistinctSupportKeys(limit 6): ${kept.length} kept`);
  console.log(
    `  completeness: ${kept.length >= 6 ? "complete" : `limited (${kept.length})`}`
  );
  console.log("");
  console.log("  THE SIX TOPICS:");
  for (const [i, k] of kept.entries()) {
    console.log(`    ${i + 1}. ${k.title}`);
    console.log(
      `       score ${k.score.overall}   evidence ${k.seed.evidenceIds.join(", ")}   fields ${k.seed.sourceFields.join(", ")}`
    );
  }

  PREFERRED_KINDS.product_education = original;
  return kept.length;
}

console.log(`Recovered ${pairs.length} outcome pairs from Zynava approved.csv`);
console.log(`Audience: ${audience}`);

runScenario(
  "SCENARIO A — health_outcome NOT in PREFERRED_KINDS (default boost 0.25)",
  false
);
runScenario(
  "SCENARIO B — health_outcome registered first for product_education",
  true
);

// --- expose the displayIntentKey collision --------------------------------

console.log("");
console.log("=".repeat(78));
console.log("DEDUPE KEY INSPECTION — why candidates get dropped");
console.log("=".repeat(78));
console.log("  supportKey                        displayIntentKey");
for (const seed of seeds) {
  console.log(
    `  ${groundedSupportKey(seed).padEnd(33)} ${displayIntentKey(seed)}`
  );
}
const displayKeys = seeds.map((s) => displayIntentKey(s));
const uniqueDisplay = new Set(displayKeys);
console.log("");
console.log(
  `  ${seeds.length} seeds -> ${uniqueDisplay.size} distinct displayIntentKeys`
);
if (uniqueDisplay.size < seeds.length) {
  const counts = new Map<string, number>();
  for (const k of displayKeys) counts.set(k, (counts.get(k) ?? 0) + 1);
  console.log("  COLLISIONS:");
  for (const [k, n] of counts) {
    if (n > 1) console.log(`    ${k}  x${n}`);
  }
}
console.log("");
