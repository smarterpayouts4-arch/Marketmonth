import fs from "node:fs";
import { normalizeText, repoRoot } from "../scan.mjs";
import { computeQualityScore } from "./compute.mjs";
import { formatQualityScoreMd } from "./format.mjs";
import { loadQualityRules } from "./rules.mjs";
import { QUALITY_SCORE_HEADER, qualityReportPaths } from "./write.mjs";

/** Strip volatile fields so CI stale-compare stays deterministic. */
function stabilizeScoreJson(score) {
  const clone = JSON.parse(JSON.stringify(score));
  clone.evaluatedAt = "<evaluatedAt>";
  if (clone.provenance) {
    clone.provenance.commitSha = "<commitSha>";
    clone.provenance.commitShort = "<commitShort>";
    clone.provenance.workingTreeStatus = "<workingTreeStatus>";
    clone.provenance.gitScope = "<gitScope>";
    clone.provenance.gitNote = "<gitNote>";
  }
  return normalizeText(JSON.stringify(clone, null, 2));
}

function stabilizeScoreMd(md) {
  return normalizeText(md)
    .replace(/Evaluated: `[^`]+`/g, "Evaluated: `<evaluatedAt>`")
    .replace(/Commit SHA: `[^`]+`/g, "Commit SHA: `<commitSha>`")
    .replace(
      /Working tree status: `[^`]+`/g,
      "Working tree status: `<workingTreeStatus>`"
    )
    .replace(/Git scope: `[^`]+`/g, "Git scope: `<gitScope>`")
    .replace(/^(- Git note: ).+$/gm, "$1<gitNote>");
}

/**
 * Recompute and compare to committed artifacts (no write).
 * @returns {{ ok: boolean, mismatches: string[], score: object }}
 */
export function checkQualityReports(
  root = repoRoot(),
  options = { withProbes: true }
) {
  const rules = loadQualityRules(root);
  const score = computeQualityScore(root, rules, options);
  const expectedMd = QUALITY_SCORE_HEADER + formatQualityScoreMd(score);
  const paths = qualityReportPaths(root);
  const mismatches = [];
  if (!fs.existsSync(paths.md)) mismatches.push(`missing ${paths.mdRel}`);
  else if (
    stabilizeScoreMd(fs.readFileSync(paths.md, "utf8")) !==
    stabilizeScoreMd(expectedMd)
  ) {
    mismatches.push(`stale ${paths.mdRel}`);
  }
  if (!fs.existsSync(paths.json)) mismatches.push(`missing ${paths.jsonRel}`);
  else {
    let disk;
    try {
      disk = JSON.parse(fs.readFileSync(paths.json, "utf8"));
    } catch {
      mismatches.push(`invalid ${paths.jsonRel}`);
      disk = null;
    }
    if (disk && stabilizeScoreJson(disk) !== stabilizeScoreJson(score)) {
      mismatches.push(`stale ${paths.jsonRel}`);
    }
  }

  const floor = rules.failBelowOutOf10;
  const belowFloor =
    typeof floor === "number" && score.officialScore.scoreOutOf10 < floor;

  return {
    ok: mismatches.length === 0 && !belowFloor,
    mismatches,
    belowFloor,
    floor,
    score,
  };
}
