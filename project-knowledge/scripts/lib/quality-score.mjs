/**
 * Thin orchestrator: project quality scoring.
 * Specialists live in ./quality-score/*
 */
export { loadQualityRules } from "./quality-score/rules.mjs";
export { computeQualityScore } from "./quality-score/compute.mjs";
export {
  formatQualityScoreMd,
  printQualityTerminal,
} from "./quality-score/format.mjs";
export {
  qualityReportPaths,
  writeQualityReports,
} from "./quality-score/write.mjs";
export { checkQualityReports } from "./quality-score/check.mjs";
