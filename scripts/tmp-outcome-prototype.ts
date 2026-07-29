/**
 * TEMPORARY prototype — delete after the topic generator rebuild.
 *
 * Proves the outcome/education layer end to end, read-only, against every
 * company fixture on disk. Nothing here is production code; it exists to show
 * the mechanism works and degrades honestly before we build it for real.
 *
 * Proves four things:
 *   1. Block separators recover structure from camel-glued crawl text.
 *   2. Offering to outcome pairs can be extracted STRUCTURALLY, with the
 *      category noun discovered from the data rather than hardcoded.
 *   3. The layer produces nothing (rather than nonsense) for businesses whose
 *      sites lack the pattern — the industry-agnostic requirement.
 *   4. Real safety gates from src/ accept the safe titles and a proposed
 *      outcome_claim_safety gate catches the unsafe ones the current gates miss.
 *
 * Usage: npx tsx scripts/tmp-outcome-prototype.ts
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { parseFixtureCsv } from "../src/brain/content/repository/parse-fixture-csv";
import type { ContentBrainContext } from "../src/brain/content/types";
import {
  hasMedicalOrStudyClaim,
  titleLengthOk,
} from "../src/brain/evaluation/creative-safety";

// ===========================================================================
// 1. The source fix, as a pure function
//
// mainContentText() in src/lib/discovery/html-clean.ts calls cheerio .text()
// on <main>, which concatenates block-level siblings with no whitespace.
// This is what inserting block separators there would yield.
// ===========================================================================

function insertBlockBoundaries(glued: string): string[] {
  return glued
    // lowercase or digit followed by uppercase: "VitaminsVitamin"
    .replace(/([a-z0-9])([A-Z])/g, "$1\n$2")
    // uppercase followed by TitleCase word: "DThe" -> "D" + "The"
    .replace(/([A-Z])([A-Z][a-z])/g, "$1\n$2")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

// ===========================================================================
// 2. Structural outcome extraction
//
// Pattern: a short offering name immediately followed by a determiner-led
// descriptor ("The Energy Mineral"). The trailing CATEGORY NOUN is discovered
// by finding tokens that repeat across descriptors — never hardcoded. That is
// what keeps this industry-agnostic: it learns "Mineral"/"Vitamin" from
// Zynava the same way it would learn "Package"/"Plan" elsewhere.
// ===========================================================================

type OutcomePair = {
  offering: string;
  descriptor: string;
  outcome: string;
  evidenceId: string;
  sourceField: string;
};

const DETERMINER_LED = /^(The|A|An|Your)\s+\S/;

function discoverCategoryNouns(descriptors: string[]): Set<string> {
  const trailing = new Map<string, number>();
  for (const d of descriptors) {
    const words = d.split(/\s+/);
    const last = words[words.length - 1]?.toLowerCase().replace(/[^a-z]/g, "");
    if (!last || last.length < 3) continue;
    trailing.set(last, (trailing.get(last) ?? 0) + 1);
  }
  // A token is a category noun only if the data repeats it.
  return new Set(
    [...trailing.entries()].filter(([, n]) => n >= 2).map(([w]) => w)
  );
}

function extractOutcomePairs(context: ContentBrainContext): OutcomePair[] {
  type Raw = {
    offering: string;
    descriptor: string;
    evidenceId: string;
    sourceField: string;
  };
  const raw: Raw[] = [];

  for (const [id, ev] of Object.entries(context.evidenceById)) {
    const segments = insertBlockBoundaries(ev.value);
    for (let i = 0; i < segments.length - 1; i += 1) {
      const offering = segments[i];
      const descriptor = segments[i + 1];
      if (!offering || !descriptor) continue;
      // Offering: a short proper-noun-ish label, not a sentence.
      if (offering.split(/\s+/).length > 3) continue;
      if (!/^[A-Z]/.test(offering)) continue;
      if (/[.?!,:;]$/.test(offering)) continue;
      // Descriptor: determiner-led noun phrase, also short.
      if (!DETERMINER_LED.test(descriptor)) continue;
      if (descriptor.split(/\s+/).length > 6) continue;
      raw.push({ offering, descriptor, evidenceId: id, sourceField: ev.field });
    }
  }

  const categoryNouns = discoverCategoryNouns(raw.map((r) => r.descriptor));

  const out: OutcomePair[] = [];
  const seen = new Set<string>();
  for (const r of raw) {
    const words = r.descriptor.split(/\s+/);
    // strip leading determiner
    let body = words.slice(1);
    // strip the discovered category noun if it trails
    const last = body[body.length - 1]?.toLowerCase().replace(/[^a-z]/g, "");
    if (last && categoryNouns.has(last)) body = body.slice(0, -1);
    const outcome = body.join(" ").trim();
    if (!outcome) continue;
    const key = `${r.offering.toLowerCase()}|${outcome.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...r, outcome });
  }
  return out;
}

// ===========================================================================
// 3. Proposed outcome_claim_safety gate
//
// The audit found 5 of 6 draft titles pass ALL existing gates, including
// "Magnesium for better sleep" and "Does vitamin D prevent illness?" — the
// latter blocks only on the title-polish path we are deleting. These are the
// rules that close that hole.
// ===========================================================================

const STRUCTURE_FUNCTION_RE =
  /\b(?:for|to)\s+(?:better\s+|improved\s+|more\s+)?(?:sleep|immunity|energy|weight|mood|illness|disease|cancer|diabetes|anxiety|depression|focus|memory)\b/i;

const OUTCOME_VERB_RE =
  /\b(?:prevent|prevents|fight|fights|boost|boosts|cure|cures|treat|treats|heal|heals|boosting|fixing)\s+(?:your\s+)?(?:illness|disease|infection|cancer|sleep|immunity|anxiety|deficiency|symptoms?)\b/i;

const EFFICACY_RE =
  /\b(?:research|evidence|studies|science)\s+(?:support|supports|prove|proves|show|shows|confirm|confirms)\b/i;

const SAFE_FRAMING_RE =
  /\b(?:nicknamed|labelled|labeled|called|on labels|label language|wording|phrase|how to compare|what to compare|price per serving|serving size|does and doesn't|will and will not|separating)\b/i;

type SafetyVerdict = { ok: boolean; reason: string };

function outcomeClaimSafety(title: string): SafetyVerdict {
  if (OUTCOME_VERB_RE.test(title)) {
    return { ok: false, reason: "asserts an outcome verb on a health state" };
  }
  if (STRUCTURE_FUNCTION_RE.test(title) && !SAFE_FRAMING_RE.test(title)) {
    return {
      ok: false,
      reason: "structure-function claim without label-language framing",
    };
  }
  if (EFFICACY_RE.test(title)) {
    return { ok: false, reason: "implies research proves an effect" };
  }
  return { ok: true, reason: "label-deconstruction / comparison framing" };
}

function gateTitle(title: string): void {
  const existing =
    !hasMedicalOrStudyClaim(title) && titleLengthOk(title)
      ? "PASS"
      : "BLOCK";
  const proposed = outcomeClaimSafety(title);
  const verdict = existing === "PASS" && proposed.ok ? "ALLOW" : "REJECT";
  console.log(`  [${verdict}] ${title}`);
  console.log(
    `           existing gates: ${existing}   outcome_claim_safety: ${
      proposed.ok ? "pass" : "FAIL"
    } (${proposed.reason})`
  );
}

// ===========================================================================
// Run across every company fixture
// ===========================================================================

const companiesDir = path.join(process.cwd(), "data", "companies");
const companies = readdirSync(companiesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

console.log("=".repeat(78));
console.log("PART 1 — Recovering structure from camel-glued crawl text");
console.log("=".repeat(78));

const zynavaCsv = readFileSync(
  path.join(companiesDir, "zynava.com", "approved.csv"),
  "utf8"
);
const zynava = parseFixtureCsv(zynavaCsv);
if (!zynava) throw new Error("zynava fixture failed to parse");

const gluedRow = Object.values(zynava.evidenceById).find(
  (ev) => ev.field === "productsServices"
);
if (gluedRow) {
  console.log("\nBEFORE (what cheerio .text() on <main> produces today):");
  console.log(`  "${gluedRow.value.slice(0, 150)}…"`);
  console.log("\nAFTER (what inserting block separators would produce):");
  for (const seg of insertBlockBoundaries(gluedRow.value).slice(0, 12)) {
    console.log(`  | ${seg}`);
  }
}

console.log("");
console.log("=".repeat(78));
console.log("PART 2 — Structural outcome extraction, per company");
console.log("=".repeat(78));

const pairsByCompany = new Map<string, OutcomePair[]>();

for (const company of companies) {
  const csvPath = path.join(companiesDir, company, "approved.csv");
  let context: ContentBrainContext | null = null;
  try {
    context = parseFixtureCsv(readFileSync(csvPath, "utf8"));
  } catch {
    context = null;
  }
  console.log("");
  console.log(`--- ${company} ---`);
  if (!context) {
    console.log("  (no parseable approved.csv)");
    pairsByCompany.set(company, []);
    continue;
  }
  const pairs = extractOutcomePairs(context);
  pairsByCompany.set(company, pairs);
  console.log(
    `  brand: ${context.brandName}   evidence rows: ${
      Object.keys(context.evidenceById).length
    }`
  );
  console.log(`  outcome pairs found: ${pairs.length}`);
  for (const p of pairs) {
    console.log(
      `    ${p.offering.padEnd(14)} -> ${p.outcome.padEnd(22)} [${p.sourceField}, ${p.evidenceId.slice(0, 12)}]`
    );
  }
  if (pairs.length === 0) {
    console.log(
      "    (degrades to zero — no invented outcomes, category stays comparison-led)"
    );
  }
}

console.log("");
console.log("=".repeat(78));
console.log("PART 3 — Six-candidate feasibility for Product Education");
console.log("=".repeat(78));

for (const [company, pairs] of pairsByCompany) {
  const distinctOutcomes = new Set(pairs.map((p) => p.outcome.toLowerCase()));
  const distinctOfferings = new Set(pairs.map((p) => p.offering.toLowerCase()));
  const supportKeys = new Set(
    pairs.map((p) => `${p.offering.toLowerCase()}|${p.outcome.toLowerCase()}`)
  );
  const status =
    supportKeys.size >= 6
      ? "complete (6 distinct supports)"
      : supportKeys.size > 0
        ? `limited (${supportKeys.size} supports)`
        : "no outcome contribution";
  console.log(
    `  ${company.padEnd(22)} offerings:${String(distinctOfferings.size).padStart(3)}  outcomes:${String(distinctOutcomes.size).padStart(3)}  supports:${String(supportKeys.size).padStart(3)}  -> ${status}`
  );
}

console.log("");
console.log("=".repeat(78));
console.log("PART 4 — Safety gates on real candidate titles");
console.log("=".repeat(78));

const zynavaPairs = pairsByCompany.get("zynava.com") ?? [];

console.log("\nSAFE FRAMING — generated from the pairs above:");
for (const p of zynavaPairs.slice(0, 4)) {
  gateTitle(
    `${p.offering} is labelled "${p.descriptor}" — what that wording means`
  );
}
if (zynavaPairs.length >= 2) {
  gateTitle(
    `What to compare on the label when two products both promise ${zynavaPairs[0]?.outcome.toLowerCase()}`
  );
  gateTitle(
    `What ZYNAVA will and will not claim about ${zynavaPairs[0]?.offering.toLowerCase()} labels`
  );
}

console.log("\nUNSAFE FRAMING — must be rejected:");
for (const bad of [
  "Magnesium for better sleep",
  "Does vitamin D prevent illness?",
  "What the research supports about magnesium and energy",
  "Vitamin C for immunity: the immune claim explained",
  "How zinc boosts immunity naturally",
]) {
  gateTitle(bad);
}

console.log("");
