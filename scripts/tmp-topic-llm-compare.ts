/**
 * TEMPORARY comparison probe — delete after the topic generator rebuild.
 *
 * Runs the SAME evidence through two generators and scores both with the real
 * scorer from src/, so we can see what the model actually adds:
 *
 *   A. deterministic template  (what you have today, no network)
 *   B. gpt-5-nano from selected evidence  (what we are building)
 *
 * Every LLM candidate passes through grounding validation and the proposed
 * outcome_claim_safety gate before it is allowed to score. Rejections are
 * printed with reasons, because the rejection rate is the real question.
 *
 * Usage:
 *   npx tsx scripts/tmp-topic-llm-compare.ts
 *   npx tsx scripts/tmp-topic-llm-compare.ts --model gpt-5.4-nano
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { config } from "dotenv";
import OpenAI from "openai";
import { z } from "zod";

import { parseFixtureCsv } from "../src/brain/content/repository/parse-fixture-csv";
import {
  hasMedicalOrStudyClaim,
  titleLengthOk,
} from "../src/brain/evaluation/creative-safety";
import { PREFERRED_KINDS } from "../src/brain/evaluation/gtc/preferred-kinds";
import { scoreCandidate } from "../src/brain/evaluation/gtc/score-candidate";
import type { TopicSeed } from "../src/brain/evaluation/objective-topic-strategies";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

function arg(flag: string, fallback: string): string {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? (process.argv[i + 1] ?? fallback) : fallback;
}

const MODEL = arg("--model", process.env.OPENAI_TOPIC_CANDIDATES_MODEL || "gpt-5-nano");
const REQUESTED = 10;

// ===========================================================================
// Evidence recovery (same structural extractor proven in the earlier probes)
// ===========================================================================

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

function readCells(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else q = !q;
    } else if (ch === "," && !q) {
      cells.push(cur);
      cur = "";
    } else cur += ch;
  }
  cells.push(cur);
  return cells;
}

const csvText = readFileSync(
  path.join(process.cwd(), "data", "companies", "zynava.com", "approved.csv"),
  "utf8"
);
const parsedContext = parseFixtureCsv(csvText);
if (!parsedContext) throw new Error("zynava fixture failed to parse");
const context = parsedContext;

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

function extractPairs(): Pair[] {
  type Raw = { offering: string; descriptor: string; id: string; field: string };
  const raw: Raw[] = [];
  for (const row of rows) {
    const segs = insertBlockBoundaries(row.value);
    for (let i = 0; i < segs.length - 1; i += 1) {
      const offering = segs[i];
      const descriptor = segs[i + 1];
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
  const offeringNames = new Set(raw.map((r) => r.offering.toLowerCase()));
  for (const r of raw) {
    let body = r.descriptor.split(/\s+/).slice(1);
    const last = body[body.length - 1]?.toLowerCase().replace(/[^a-z]/g, "");
    if (last && categoryNouns.has(last)) body = body.slice(0, -1);
    const outcome = body.join(" ").trim();
    if (!outcome) continue;
    // synonym filter: descriptor body restating an offering name (B2 -> Riboflavin)
    if (offeringNames.has(outcome.toLowerCase())) continue;
    const key = `${r.offering.toLowerCase()}|${outcome.toLowerCase()}`;
    const prev = byKey.get(key);
    if (prev) {
      if (!prev.evidenceIds.includes(r.id)) prev.evidenceIds.push(r.id);
      if (!prev.sourceFields.includes(r.field)) prev.sourceFields.push(r.field);
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

const pairs = extractPairs();

// Supporting evidence the category also gets: FAQs, catalog, positioning.
const supporting = rows.filter((r) =>
  ["faq", "indexedProduct", "valueProposition", "customerProblems"].includes(
    r.field
  )
);

// ===========================================================================
// Safety gates (proposed outcome_claim_safety, verified in the earlier probe)
// ===========================================================================

const STRUCTURE_FUNCTION_RE =
  /\b(?:for|to)\s+(?:better\s+|improved\s+|more\s+)?(?:sleep|immunity|energy|weight|mood|illness|disease|cancer|diabetes|anxiety|depression|focus|memory)\b/i;
const OUTCOME_VERB_RE =
  /\b(?:prevent|prevents|fight|fights|boost|boosts|cure|cures|treat|treats|heal|heals)\s+(?:your\s+)?(?:illness|disease|infection|cancer|sleep|immunity|anxiety|deficiency|symptoms?)\b/i;
const EFFICACY_RE =
  /\b(?:research|evidence|studies|science)\s+(?:support|supports|prove|proves|show|shows|confirm|confirms)\b/i;
const SAFE_FRAMING_RE =
  /\b(?:nicknamed|labelled|labeled|called|on labels|label language|wording|phrase|how to compare|what to compare|price per serving|serving size|does and doesn't|will and will not|separating)\b/i;

function outcomeClaimSafety(title: string): { ok: boolean; reason: string } {
  if (OUTCOME_VERB_RE.test(title)) {
    return { ok: false, reason: "outcome verb on a health state" };
  }
  if (STRUCTURE_FUNCTION_RE.test(title) && !SAFE_FRAMING_RE.test(title)) {
    return { ok: false, reason: "structure-function claim, no label framing" };
  }
  if (EFFICACY_RE.test(title)) {
    return { ok: false, reason: "implies research proves an effect" };
  }
  return { ok: true, reason: "ok" };
}

// ===========================================================================
// Prompt — draft of the real build-prompt.ts
// ===========================================================================

const CATEGORY_PURPOSE =
  "Product Education: teach the reader how to understand what a product is, what its label language means, and how to read a catalog. The goal is comprehension, not persuasion and not a purchase decision.";

function buildSystem(): string {
  return [
    "You generate marketing topic candidates for a content strategy tool.",
    "You are given a company's own observed website evidence. You may ONLY write topics that the supplied evidence can support.",
    "",
    `CATEGORY: ${CATEGORY_PURPOSE}`,
    "",
    "GROUNDING RULES",
    "- Every candidate must cite at least one evidenceRef id from the supplied evidence.",
    "- Every product name, label phrase, or fact in the title must appear verbatim in the evidence you cite.",
    "- Never introduce a number, percentage, price, study, certification, or date that is not in the evidence.",
    "- Never claim the brand sells, stocks, or recommends anything unless the evidence says so.",
    "",
    "REGULATED-CLAIM RULES (this brand is educational only and does not give medical advice)",
    "- Never state or imply that a product treats, cures, prevents, heals, boosts, or fixes any health condition or outcome.",
    "- Never write 'X for sleep', 'X for immunity', 'X for energy' style benefit promises.",
    "- Never imply that research, studies, or science prove an effect.",
    "- You MAY deconstruct the brand's own label language: quote the nickname the brand uses and explain what that wording does and does not mean.",
    "- You MAY teach comparison mechanics: label reading, serving size, form, price per serving.",
    "",
    "PROHIBITED",
    "- No internal SEO or ops instructions ('improve homepage copy').",
    "- No superlatives: best, worst, guaranteed, miracle, secret, toxic, dangerous.",
    "- No invented audience segments.",
    "",
    "Return JSON only, matching this shape exactly:",
    JSON.stringify(
      {
        candidates: [
          {
            id: "string",
            title: "string, 24-90 chars",
            hook: "one sentence on why someone clicks",
            audienceQuestion: "the question the reader is actually asking",
            strategicAngle: "string",
            whyItFits: "why this serves the category, referencing the evidence",
            suggestedFormats: ["string"],
            platformFit: ["string"],
            funnelRole: "awareness | consideration | decision",
            evidenceRefs: ["evidence id"],
            confidence: "high | medium | low",
          },
        ],
      },
      null,
      2
    ),
  ].join("\n");
}

function buildUser(): string {
  const lines: string[] = [];
  lines.push("BUSINESS IDENTITY");
  lines.push(`name: ${context.brandName}`);
  lines.push(`website: ${context.website ?? "(none)"}`);
  lines.push(`what it does: ${context.description ?? "(none)"}`);
  lines.push(`value proposition: ${context.valueProposition ?? "(none)"}`);
  lines.push(`brand voice: ${context.brandVoice ?? "(none)"}`);
  lines.push("");
  lines.push(
    "OBSERVED LABEL PAIRINGS (the brand's own catalog wording; offering -> the phrase the brand attaches to it)"
  );
  for (const p of pairs) {
    lines.push(
      `- ${p.offering} is labelled "${p.descriptor}"  [evidenceRefs: ${p.evidenceIds.join(", ")}]`
    );
  }
  lines.push("");
  lines.push("SUPPORTING EVIDENCE");
  for (const s of supporting.slice(0, 12)) {
    lines.push(`- [${s.id}] (${s.field}) ${s.value.slice(0, 220)}`);
  }
  lines.push("");
  lines.push(`Generate ${REQUESTED} candidates. JSON only.`);
  return lines.join("\n");
}

// ===========================================================================
// Scoring helpers
// ===========================================================================

const audience =
  context.audience ?? "Shoppers comparing supplements before buying";

function seedFor(p: Pair): TopicSeed {
  return {
    subject: p.offering,
    subjectType: "health_outcome" as never,
    audienceNeed: audience,
    evidenceIds: p.evidenceIds,
    sourceFields: p.sourceFields,
    classificationReason: `Brand label pairs ${p.offering} with "${p.descriptor}"`,
    classificationConfidence: "high",
    frameHint: "outcome_label_deconstruction",
    sourceType: "brand_observed",
  };
}

function scoreTitle(title: string, seed: TopicSeed): number {
  return scoreCandidate({
    title,
    seed,
    objective: "product_education",
    context,
    recentKeys: new Set<string>(),
    audience,
  }).overall;
}

// register health_outcome so both generators are scored on equal footing
PREFERRED_KINDS.product_education = [
  "health_outcome" as never,
  ...PREFERRED_KINDS.product_education,
];

// ===========================================================================
// A — deterministic
// ===========================================================================

console.log("=".repeat(78));
console.log("GENERATOR A — deterministic template (no network)");
console.log("=".repeat(78));

const deterministic = pairs
  .map((p) => {
    const title = `${p.offering} is labelled "${p.descriptor}" — what that wording means`;
    return { title, pair: p, score: scoreTitle(title, seedFor(p)) };
  })
  .sort((a, b) => b.score - a.score);

// family cap: no more than 3 per leading-token group
function groupOf(offering: string): string {
  return offering.trim().split(/\s+/)[0]!.toLowerCase();
}
const detKept: typeof deterministic = [];
const detGroups = new Map<string, number>();
for (const d of deterministic) {
  const g = groupOf(d.pair.offering);
  const n = detGroups.get(g) ?? 0;
  if (n >= 3) continue;
  detGroups.set(g, n + 1);
  detKept.push(d);
  if (detKept.length >= 6) break;
}
for (const [i, d] of detKept.entries()) {
  console.log(`  ${i + 1}. [${d.score.toFixed(2)}] ${d.title}`);
}

// ===========================================================================
// B — gpt-5-nano
// ===========================================================================

const candidateSchema = z.object({
  candidates: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1),
        hook: z.string().default(""),
        audienceQuestion: z.string().default(""),
        strategicAngle: z.string().default(""),
        whyItFits: z.string().default(""),
        suggestedFormats: z.array(z.string()).default([]),
        platformFit: z.array(z.string()).default([]),
        funnelRole: z.string().default("consideration"),
        evidenceRefs: z.array(z.string()).default([]),
        confidence: z.string().default("medium"),
      })
    )
    .min(1),
});

console.log("");
console.log("=".repeat(78));
console.log(`GENERATOR B — ${MODEL} from the same evidence`);
console.log("=".repeat(78));

type Accepted = {
  title: string;
  hook: string;
  whyItFits: string;
  audienceQuestion: string;
  funnelRole: string;
  platformFit: string[];
  refs: string[];
  offering: string;
  score: number;
};
async function main(): Promise<void> {
const apiKey = process.env.OPENAI_API_KEY?.trim();
if (!apiKey) {
  console.log("  OPENAI_API_KEY not visible to this process — cannot compare.");
  return;
}

const allowedIds = new Set(rows.map((r) => r.id));
const evidenceText = new Map(rows.map((r) => [r.id, r.value.toLowerCase()]));

const client = new OpenAI({ apiKey });
const started = Date.now();
let raw = "";
try {
  const completion = await client.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildSystem() },
      { role: "user", content: buildUser() },
    ],
  });
  raw = completion.choices[0]?.message?.content ?? "";
  const u = completion.usage;
  console.log(
    `  model ${MODEL}   ${Date.now() - started}ms   tokens in ${u?.prompt_tokens ?? "?"} out ${u?.completion_tokens ?? "?"}`
  );
} catch (err) {
  console.log(`  API error: ${err instanceof Error ? err.message : String(err)}`);
  return;
}

let parsed: unknown;
try {
  parsed = JSON.parse(raw);
} catch {
  console.log("  invalid JSON from model");
  console.log(raw.slice(0, 500));
  return;
}
const result = candidateSchema.safeParse(parsed);
if (!result.success) {
  console.log(`  schema mismatch: ${result.error.issues[0]?.message}`);
  console.log(JSON.stringify(parsed).slice(0, 600));
  return;
}

const accepted: Accepted[] = [];
const rejected: Array<{ title: string; reason: string }> = [];

for (const c of result.data.candidates) {
  if (!titleLengthOk(c.title)) {
    rejected.push({ title: c.title, reason: `length ${c.title.length}` });
    continue;
  }
  if (hasMedicalOrStudyClaim(c.title)) {
    rejected.push({ title: c.title, reason: "medical/study claim" });
    continue;
  }
  const safety = outcomeClaimSafety(c.title);
  if (!safety.ok) {
    rejected.push({ title: c.title, reason: safety.reason });
    continue;
  }
  const refs = c.evidenceRefs.filter((r) => allowedIds.has(r));
  if (refs.length === 0) {
    rejected.push({
      title: c.title,
      reason: `no valid evidenceRef (gave ${c.evidenceRefs.join(", ") || "none"})`,
    });
    continue;
  }
  // grounding: the offering named in the title must appear in the cited evidence
  const matchedPair = pairs.find((p) =>
    c.title.toLowerCase().includes(p.offering.toLowerCase())
  );
  if (!matchedPair) {
    rejected.push({ title: c.title, reason: "no observed offering in title" });
    continue;
  }
  const citedBlob = refs.map((r) => evidenceText.get(r) ?? "").join(" ");
  if (!citedBlob.includes(matchedPair.offering.toLowerCase())) {
    rejected.push({
      title: c.title,
      reason: `"${matchedPair.offering}" absent from cited evidence`,
    });
    continue;
  }
  accepted.push({
    title: c.title,
    hook: c.hook,
    whyItFits: c.whyItFits,
    audienceQuestion: c.audienceQuestion,
    funnelRole: c.funnelRole,
    platformFit: c.platformFit,
    refs,
    offering: matchedPair.offering,
    score: scoreTitle(c.title, seedFor(matchedPair)),
  });
}

accepted.sort((a, b) => b.score - a.score);

const llmKept: Accepted[] = [];
const llmGroups = new Map<string, number>();
for (const a of accepted) {
  const g = groupOf(a.offering);
  const n = llmGroups.get(g) ?? 0;
  if (n >= 3) continue;
  llmGroups.set(g, n + 1);
  llmKept.push(a);
  if (llmKept.length >= 6) break;
}

console.log(
  `  returned ${result.data.candidates.length}   accepted ${accepted.length}   rejected ${rejected.length}   kept after family cap ${llmKept.length}`
);
console.log("");
for (const [i, a] of llmKept.entries()) {
  console.log(`  ${i + 1}. [${a.score.toFixed(2)}] ${a.title}`);
  console.log(`       hook:     ${a.hook}`);
  console.log(`       asks:     ${a.audienceQuestion}`);
  console.log(`       fits:     ${a.whyItFits}`);
  console.log(
    `       funnel:   ${a.funnelRole}   platforms: ${a.platformFit.join(", ")}`
  );
  console.log(`       evidence: ${a.refs.join(", ")}`);
  console.log("");
}

if (rejected.length > 0) {
  console.log("  REJECTED BY THE VALIDATOR:");
  for (const r of rejected) {
    console.log(`    - ${r.title}`);
    console.log(`      reason: ${r.reason}`);
  }
}

console.log("");
console.log("=".repeat(78));
console.log("SIDE BY SIDE");
console.log("=".repeat(78));
for (let i = 0; i < 6; i += 1) {
  console.log(`  ${i + 1}. A  ${detKept[i]?.title ?? "(none)"}`);
  console.log(`     B  ${llmKept[i]?.title ?? "(none)"}`);
}
console.log("");
}

void main();
