import { collectQualityEvidence } from "../quality-collect.mjs";
import { repoRoot } from "../scan.mjs";
import { applyRubric } from "./apply.mjs";
import { buildScoreProvenance } from "./provenance.mjs";
import { loadQualityRules } from "./rules.mjs";
import { computeExternalBaseline } from "../external-baseline.mjs";

/**
 * @param {string} root
 * @param {object} [rules]
 * @param {{ withProbes?: boolean }} [options]
 */
export function computeQualityScore(
  root = repoRoot(),
  rules = loadQualityRules(root),
  options = {}
) {
  const evidence = collectQualityEvidence(root, rules, options);
  const applied = applyRubric(rules, evidence);

  const improvementPlan = applied.deductions
    .slice()
    .sort((a, b) => b.deducted - a.deducted)
    .map((d) => ({
      ruleId: d.ruleId,
      priority: d.deducted >= 4 ? "high" : d.deducted >= 2 ? "medium" : "low",
      action: d.description,
      evidenceSample: d.evidence.slice(0, 5),
      status: d.status,
    }));

  const provenance = buildScoreProvenance(
    root,
    {
      ...evidence,
      officialNotEvaluatedRules: applied.notEvaluatedRules,
    },
    rules
  );

  const externalBaseline = computeExternalBaseline(root, {
    evidence,
    applied,
    rules,
  });

  return {
    schemaVersion: 2,
    scoreType: "Internal Engineering Quality Score",
    rubricVersion: rules.rubricVersion || "1.0.0",
    evaluatedAt: evidence.collectedAt,
    withProbes: evidence.withProbes,
    probeStatus: evidence.probeStatus,
    provenance,
    officialScore: {
      label: "Internal Engineering Quality Score",
      totalPoints: applied.totalPoints,
      maxScore: applied.maxScore,
      scoreOutOf10: applied.scoreOutOf10,
      formula: `${applied.totalPoints}/${applied.maxScore} = ${applied.scoreOutOf10}/10`,
      evaluationsComplete: applied.evaluationsComplete,
      perfectEligible: applied.perfectEligible,
      notEvaluatedRules: applied.notEvaluatedRules,
      disclaimer:
        "MarketMonth Internal Engineering Quality Score against the project rubric only. Not industry-certified, independently certified, or externally validated.",
    },
    externalBaseline,
    categories: applied.categories,
    deductions: applied.deductions,
    stats: evidence.stats,
    thresholds: evidence.thresholds,
    improvementPlan,
    aiReview: {
      enabled: Boolean(rules.aiAdvisory?.enabled),
      note:
        rules.aiAdvisory?.note ||
        "AI findings are advisory only and never alter officialScore.",
      observations: [],
      affectsOfficialScore: false,
    },
    hardFailures: applied.hardFailures,
    softWarnings: evidence.stats.guardianSoft,
  };
}
