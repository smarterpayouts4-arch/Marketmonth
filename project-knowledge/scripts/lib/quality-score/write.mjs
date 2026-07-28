import fs from "node:fs";
import path from "node:path";
import { generatedHeader, normalizeText, repoRoot } from "../scan.mjs";
import { computeQualityScore } from "./compute.mjs";
import { formatQualityScoreMd } from "./format.mjs";
import { loadQualityRules } from "./rules.mjs";

/** Shared by write + check so stale compare stays aligned. */
export const QUALITY_SCORE_HEADER = generatedHeader(
  "project-knowledge/scripts/lib/quality-score/write.mjs"
);

export function qualityReportPaths(root = repoRoot()) {
  const dir = path.join(root, "project-knowledge", "generated", "reports");
  return {
    dir,
    md: path.join(dir, "QUALITY_SCORE.md"),
    json: path.join(dir, "quality-score.json"),
    mdRel: "generated/reports/QUALITY_SCORE.md",
    jsonRel: "generated/reports/quality-score.json",
  };
}

export function writeQualityReports(
  root = repoRoot(),
  score,
  options = {}
) {
  const resolved =
    score ||
    computeQualityScore(root, loadQualityRules(root), options);
  const paths = qualityReportPaths(root);
  fs.mkdirSync(paths.dir, { recursive: true });
  const md = QUALITY_SCORE_HEADER + formatQualityScoreMd(resolved);
  const json = normalizeText(JSON.stringify(resolved, null, 2));
  fs.writeFileSync(paths.md, md, "utf8");
  fs.writeFileSync(paths.json, json, "utf8");
  return { paths, score: resolved, md, json };
}
