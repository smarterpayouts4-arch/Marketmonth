/**
 * TEMPORARY probe — delete after the topic generator rebuild.
 *
 * Quantifies how much outcome fuel is lost to two separate defects, so we know
 * which upstream fixes are actually required rather than nice to have:
 *
 *   A. projectionToBrainContext drops `signal` rows, so the brain never sees
 *      the mineral half of Zynava's catalog.
 *   B. build-discovery-evidence clips productsServices to 280 chars, cutting
 *      the vitamin list off partway.
 *
 * Read-only: parses the CSV text directly, no crawl, no writes.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { parseFixtureCsv } from "../src/brain/content/repository/parse-fixture-csv";

function insertBlockBoundaries(glued: string): string[] {
  return glued
    .replace(/([a-z0-9])([A-Z])/g, "$1\n$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1\n$2")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

const DETERMINER_LED = /^(The|A|An|Your)\s+\S/;

function pairsFrom(text: string): Array<{ offering: string; outcome: string }> {
  const segments = insertBlockBoundaries(text);
  const raw: Array<{ offering: string; descriptor: string }> = [];
  for (let i = 0; i < segments.length - 1; i += 1) {
    const offering = segments[i];
    const descriptor = segments[i + 1];
    if (!offering || !descriptor) continue;
    if (offering.split(/\s+/).length > 3) continue;
    if (!/^[A-Z]/.test(offering)) continue;
    if (/[.?!,:;]$/.test(offering)) continue;
    if (!DETERMINER_LED.test(descriptor)) continue;
    if (descriptor.split(/\s+/).length > 6) continue;
    raw.push({ offering, descriptor });
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
  const out: Array<{ offering: string; outcome: string }> = [];
  const seen = new Set<string>();
  for (const r of raw) {
    let body = r.descriptor.split(/\s+/).slice(1);
    const last = body[body.length - 1]?.toLowerCase().replace(/[^a-z]/g, "");
    if (last && categoryNouns.has(last)) body = body.slice(0, -1);
    const outcome = body.join(" ").trim();
    if (!outcome) continue;
    const key = `${r.offering.toLowerCase()}|${outcome.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ offering: r.offering, outcome });
  }
  return out;
}

const csvPath = path.join(
  process.cwd(),
  "data",
  "companies",
  "zynava.com",
  "approved.csv"
);
const csvText = readFileSync(csvPath, "utf8");
const context = parseFixtureCsv(csvText);
if (!context) throw new Error("parse failed");

// --- A: what the brain sees today -----------------------------------------
const contextPairs = new Set<string>();
for (const ev of Object.values(context.evidenceById)) {
  for (const p of pairsFrom(ev.value)) {
    contextPairs.add(`${p.offering} -> ${p.outcome}`);
  }
}

// --- B: what the CSV actually contains, including dropped signal rows ------
// Pull raw cell values off the CSV without going through the projection, so we
// can see the rows the brain context never receives.
const rawValues: Array<{ recordType: string; field: string; value: string }> = [];
{
  // minimal CSV cell reader — the file is quoted with doubled inner quotes
  const lines = csvText.split(/\r?\n/).slice(1);
  for (const line of lines) {
    if (!line.trim()) continue;
    const cells: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        cells.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur);
    if (cells.length >= 3) {
      rawValues.push({
        recordType: cells[0] ?? "",
        field: cells[1] ?? "",
        value: cells[2] ?? "",
      });
    }
  }
}

const csvPairs = new Map<string, string>();
for (const r of rawValues) {
  for (const p of pairsFrom(r.value)) {
    csvPairs.set(`${p.offering} -> ${p.outcome}`, `${r.recordType}|${r.field}`);
  }
}

console.log("=".repeat(78));
console.log("OUTCOME FUEL — what the brain gets vs what the CSV holds");
console.log("=".repeat(78));
console.log(`pairs visible to the brain today      ${contextPairs.size}`);
console.log(`pairs present in the CSV overall      ${csvPairs.size}`);
console.log("");
console.log("PAIR                                        VISIBLE?  SOURCE ROW");
console.log("-".repeat(78));
for (const [pair, source] of [...csvPairs.entries()].sort()) {
  const visible = contextPairs.has(pair);
  console.log(
    `${pair.padEnd(43)} ${visible ? "yes     " : "NO      "} ${source}`
  );
}

const lost = [...csvPairs.entries()].filter(([p]) => !contextPairs.has(p));
console.log("");
console.log(
  `LOST TO THE SIGNAL-ROW DROP: ${lost.length} of ${csvPairs.size} pairs`
);
for (const [pair, source] of lost) {
  console.log(`  ${pair}   (${source})`);
}

// --- C: the 280-char clip -------------------------------------------------
const productsServices = rawValues.find(
  (r) => r.recordType === "evidence" && r.field === "productsServices"
);
const signalProductText = rawValues.find(
  (r) => r.recordType === "signal" && r.field === "product_text"
);
console.log("");
console.log("=".repeat(78));
console.log("CLIP ANALYSIS");
console.log("=".repeat(78));
console.log(
  `evidence|productsServices  length ${productsServices?.value.length ?? 0} chars (clip() caps at 280)`
);
console.log(
  `signal|product_text        length ${signalProductText?.value.length ?? 0} chars (uncapped at this stage)`
);
console.log(
  `pairs recoverable from productsServices  ${pairsFrom(productsServices?.value ?? "").length}`
);
console.log(
  `pairs recoverable from signal product_text  ${pairsFrom(signalProductText?.value ?? "").length}`
);
console.log("");
