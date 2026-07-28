#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { buildGeneratedContents, normalizeText, repoRoot } from "./lib/scan.mjs";
import { runGuardian, writeWarningsReport } from "./guardian.mjs";

const root = repoRoot();
const hard = [];
const soft = [];

function fail(msg) {
  hard.push(msg);
}

// Exact normalized compare: regenerate in memory vs committed maps/indexes
const { files } = buildGeneratedContents(root);
for (const [rel, expected] of Object.entries(files)) {
  const full = path.join(root, "project-knowledge", "generated", rel);
  if (!fs.existsSync(full)) {
    fail(`Generated artifact missing: generated/${rel} — run npm run knowledge:update`);
    continue;
  }
  const actual = normalizeText(fs.readFileSync(full, "utf8"));
  const want = normalizeText(expected);
  if (actual !== want) {
    fail(
      `Stale or hand-edited generated/${rel} — run npm run knowledge:update (exact content mismatch)`
    );
  }
}

// Guardian (hard + soft with codes)
const g = runGuardian(root);
writeWarningsReport(root, g.hard, g.soft);
for (const h of g.hard) hard.push(`${h.code}: ${h.message}`);
for (const w of g.soft) soft.push(`${w.code}: ${w.message}`);

console.error(`knowledge:check — hard=${hard.length} soft=${soft.length}`);
if (hard.length) {
  for (const h of hard) console.error("ERROR:", h);
  process.exit(1);
}
for (const w of soft) console.error("WARN:", w);
console.error("knowledge:check PASS (hard rules)");
