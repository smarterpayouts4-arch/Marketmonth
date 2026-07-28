#!/usr/bin/env node
/**
 * Project quality rubric — deterministic official score + evidence reports.
 *
 *   node project-knowledge/scripts/quality.mjs           # update with probes
 *   node project-knowledge/scripts/quality.mjs --fast    # skip typecheck/lint/test probes
 *   node project-knowledge/scripts/quality.mjs --check   # stale compare (probes on)
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { repoRoot } from "./lib/scan.mjs";
import {
  checkQualityReports,
  printQualityTerminal,
  writeQualityReports,
} from "./lib/quality-score.mjs";

const __filename = fileURLToPath(import.meta.url);
const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isMain) {
  const root = repoRoot();
  const check = process.argv.includes("--check");
  const withProbes = !process.argv.includes("--fast");

  if (check) {
    const result = checkQualityReports(root, { withProbes: true });
    console.error(printQualityTerminal(result.score));
    console.error("");
    if (result.mismatches.length) {
      for (const m of result.mismatches)
        console.error(`ERROR: ${m} — run npm run quality:update`);
      process.exit(1);
    }
    if (result.belowFloor) {
      console.error(
        `ERROR: score ${result.score.officialScore.scoreOutOf10}/10 below failBelowOutOf10=${result.floor}`
      );
      process.exit(1);
    }
    if (!result.score.officialScore.evaluationsComplete) {
      console.error(
        "ERROR: quality:check requires complete probe evaluations (typecheck/lint/test)"
      );
      process.exit(1);
    }
    console.error("quality:check PASS");
    process.exit(0);
  }

  const { score } = writeQualityReports(root, undefined, { withProbes });
  console.error(printQualityTerminal(score));
  if (!score.officialScore.evaluationsComplete) {
    console.error(
      "NOTE: some checks are NOT_EVALUATED — score is incomplete (use quality:update without --fast)"
    );
  }
  console.error(
    `quality:update OK — wrote generated/reports/QUALITY_SCORE.md + quality-score.json`
  );
}
