/** Manual diagnostic — not wired in package.json. */
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Load .env.local without printing secrets
try {
  const envPath = path.join(process.cwd(), ".env.local");
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    if (process.env[m[1]] !== undefined) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    process.env[m[1]] = v;
  }
} catch {
  /* optional */
}

const { parseFixtureCsv } = await import(
  pathToFileURL(
    path.join(process.cwd(), "src/brain/content/repository/parse-fixture-csv.ts")
  ).href
);
const { generateTopicCandidates } = await import(
  pathToFileURL(
    path.join(process.cwd(), "src/brain/evaluation/generate-topic-candidates.ts")
  ).href
);
const { polishTopicCandidateTitles } = await import(
  pathToFileURL(
    path.join(
      process.cwd(),
      "src/brain/evaluation/gtc/topic-title-polish/polish.ts"
    )
  ).href
);
const { isMalformedSubjectLabel } = await import(
  pathToFileURL(
    path.join(process.cwd(), "src/brain/evaluation/subjects/subject-label.ts")
  ).href
);

const text = readFileSync(
  path.join(process.cwd(), "data/fixtures/zynava-discovery.csv"),
  "utf8"
);
const context = parseFixtureCsv(text);
if (!context) throw new Error("no context");

console.log("=== 1) Malformed subject gate ===");
const checks = [
  ["Shoppers comparing", true],
  ["supplement prices and formulations in on", true],
  ["Help overwhelmed", true],
  ["overwhelmed shoppers", false],
  ["Supplement search", false],
  ["Magnesium glycinate", false],
];
let gateOk = true;
for (const [label, expect] of checks) {
  const got = isMalformedSubjectLabel(label);
  const ok = got === expect;
  if (!ok) gateOk = false;
  console.log(`${ok ? "OK" : "FAIL"} | ${JSON.stringify(label)} => ${got}`);
}

console.log("\n=== 2) Env (no secrets) ===");
console.log(
  "TOPIC_TITLE_POLISH_PROVIDER=",
  process.env.TOPIC_TITLE_POLISH_PROVIDER ?? "(unset)"
);
console.log(
  "OPENAI_TOPIC_TITLE_POLISH_MODEL=",
  process.env.OPENAI_TOPIC_TITLE_POLISH_MODEL ?? "(unset)"
);
console.log("OPENAI_API_KEY set=", Boolean(process.env.OPENAI_API_KEY?.trim()));

const det = generateTopicCandidates({
  context,
  objective: "brand_awareness",
  recentTitles: [],
});
if (det.status !== "success") {
  console.log("deterministic status", det.status);
  process.exit(1);
}

console.log("\n=== 3) Provider OFF ===");
process.env.TOPIC_TITLE_POLISH_PROVIDER = "deterministic-only";
const off = await polishTopicCandidateTitles({
  generation: det,
  context,
  objective: "brand_awareness",
});
if (off.status === "success") {
  const sources = [...new Set(off.candidates.map((c) => c.titleSource))];
  const same = off.candidates.every(
    (c) => c.title === (c.originalTitle ?? c.title)
  );
  console.log("titleSources=", sources.join(","));
  console.log("titles===originalTitles=", same);
  console.log(
    "OK off-path=",
    sources.length === 1 && sources[0] === "deterministic-v2" && same
  );
}

console.log("\n=== 4) Provider ON (live OpenAI if key present) ===");
process.env.TOPIC_TITLE_POLISH_PROVIDER = "openai";
if (!process.env.OPENAI_TOPIC_TITLE_POLISH_MODEL) {
  process.env.OPENAI_TOPIC_TITLE_POLISH_MODEL = "gpt-5-nano";
}
const on = await polishTopicCandidateTitles({
  generation: det,
  context,
  objective: "brand_awareness",
});
if (on.status !== "success") {
  console.log("FAIL on-path status", on.status);
  process.exit(1);
}

let peLeak = false;
const peShell =
  /\b(check the label|before you buy|serving size|price per serving)\b/i;
for (const c of on.candidates) {
  const changed = c.title !== (c.originalTitle ?? "");
  console.log(
    `${c.rank} | ${c.titleSource} | changed=${changed} | kind=${c.subjectKind}`
  );
  console.log(`  original: ${c.originalTitle}`);
  console.log(`  title:    ${c.title}`);
  if (
    c.subjectKind !== "comparison_attribute" &&
    peShell.test(c.title) &&
    c.titleSource === "openai-polished"
  ) {
    peLeak = true;
    console.log("  !! PE shell leak on polished brand_awareness title");
  }
}

const idsSame = on.candidates.every(
  (c, i) => c.topicId === det.candidates[i].topicId
);
const ranksSame = on.candidates.every((c, i) => c.rank === det.candidates[i].rank);
const scoresSame = on.candidates.every(
  (c, i) => c.score.overall === det.candidates[i].score.overall
);
const polishedCount = on.candidates.filter(
  (c) => c.titleSource === "openai-polished"
).length;
const fallbackCount = on.candidates.filter(
  (c) => c.titleSource === "openai-fallback"
).length;

console.log("\n=== 5) Invariants ===");
console.log("idsUnchanged=", idsSame);
console.log("ranksUnchanged=", ranksSame);
console.log("scoresUnchanged=", scoresSame);
console.log("polishedCount=", polishedCount);
console.log("fallbackBatch=", fallbackCount === on.candidates.length);
console.log("peShellLeak=", peLeak);
console.log("gateOk=", gateOk);

const healthy =
  gateOk &&
  idsSame &&
  ranksSame &&
  scoresSame &&
  !peLeak &&
  (polishedCount > 0 || fallbackCount === on.candidates.length);
console.log("\n=== VERDICT ===", healthy ? "HEALTHY" : "NEEDS ATTENTION");
process.exit(healthy ? 0 : 2);
