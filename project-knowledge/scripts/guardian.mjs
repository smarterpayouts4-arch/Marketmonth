#!/usr/bin/env node
/**
 * Structure guardian — thin orchestrator.
 * Specialists live in ./guardian/*
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { repoRoot } from "./lib/scan.mjs";
import { writeWarningsReport } from "./guardian/report.mjs";
import { runGuardian } from "./guardian/run.mjs";

export { WARN_CODES } from "./guardian/codes.mjs";
export { runGuardian } from "./guardian/run.mjs";
export { formatWarningsReport, writeWarningsReport } from "./guardian/report.mjs";

const __filename = fileURLToPath(import.meta.url);
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isMain) {
  const root = repoRoot();
  const { hard, soft } = runGuardian(root);
  writeWarningsReport(root, hard, soft);
  console.error(`knowledge:guardian — hard=${hard.length} soft=${soft.length}`);
  for (const h of hard) console.error(`ERROR ${h.code}: ${h.message}`);
  for (const w of soft) console.error(`WARN ${w.code}: ${w.message}`);
  if (hard.length && process.argv.includes("--fail-on-hard")) process.exit(1);
}
