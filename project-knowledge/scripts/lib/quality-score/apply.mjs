/**
 * Pure scoring from evidence — used by compute + unit tests.
 * Missing check keys → NOT_EVALUATED (never silent full credit).
 */
import { NOT_EVALUATED } from "../quality-collect/util.mjs";

/**
 * @param {object} rules
 * @param {{ byCheck: Record<string, string[]|undefined>, withProbes: boolean, stats?: object, probeStatus?: object }} evidence
 */
export function applyRubric(rules, evidence) {
  const categories = (rules.categories || []).map((c) => ({
    id: c.id,
    label: c.label,
    maxPoints: c.maxPoints,
    points: c.maxPoints,
    deductions: [],
    notEvaluated: [],
    checksContributing: [],
  }));
  const byId = new Map(categories.map((c) => [c.id, c]));
  const allDeductions = [];
  const notEvaluatedRules = [];

  for (const rule of rules.rules || []) {
    const cat = byId.get(rule.category);
    if (!cat) continue;
    cat.checksContributing.push(rule.ruleId);

    const rawFindings = evidence.byCheck?.[rule.check];
    const missingKey = !Object.prototype.hasOwnProperty.call(
      evidence.byCheck || {},
      rule.check
    );
    const findings = missingKey
      ? [NOT_EVALUATED]
      : Array.isArray(rawFindings)
        ? rawFindings
        : [NOT_EVALUATED];

    if (!findings.length) {
      // Empty array = evaluated pass with evidence of zero findings
      continue;
    }

    const per = rule.deductionPerFinding ?? 1;
    const maxD = rule.maximumDeduction ?? per;
    const isNotEvaluated =
      missingKey || findings.includes(NOT_EVALUATED);
    const deducted = isNotEvaluated
      ? maxD
      : Math.min(maxD, findings.length * per);
    if (deducted <= 0) continue;

    const entry = {
      ruleId: rule.ruleId,
      category: rule.category,
      description: rule.description,
      reason: rule.reason || "",
      deducted,
      findingCount: findings.length,
      evidence: findings.slice(0, 40),
      evidenceTruncated: findings.length > 40,
      status: isNotEvaluated ? NOT_EVALUATED : "deducted",
    };
    cat.deductions.push(entry);
    allDeductions.push(entry);
    cat.points = Math.max(0, cat.points - deducted);
    if (isNotEvaluated) {
      cat.notEvaluated.push(rule.ruleId);
      notEvaluatedRules.push(rule.ruleId);
    }
  }

  const hardFailures = evidence.stats?.guardianHard ?? 0;
  const totalPoints = categories.reduce((s, c) => s + c.points, 0);
  const maxScore = rules.maxScore ?? 100;
  const divisor = rules.displayDivisor ?? 10;
  let scoreOutOf10 = Math.round((totalPoints / maxScore) * divisor * 10) / 10;

  const evaluationsComplete =
    notEvaluatedRules.length === 0 && Boolean(evidence.withProbes);

  const perfectEligible =
    evaluationsComplete &&
    hardFailures === 0 &&
    totalPoints === maxScore &&
    notEvaluatedRules.length === 0;

  // Never display a perfect score when required evaluations are incomplete.
  if (!perfectEligible && scoreOutOf10 >= 10) {
    scoreOutOf10 = 9.9;
  }
  if (!evaluationsComplete && scoreOutOf10 >= 10) {
    scoreOutOf10 = 9.9;
  }

  return {
    categories: categories.map((c) => ({
      id: c.id,
      label: c.label,
      points: c.points,
      maxPoints: c.maxPoints,
      scoreOutOf10: Math.round((c.points / c.maxPoints) * 10 * 10) / 10,
      deductions: c.deductions,
      notEvaluated: c.notEvaluated,
      checksContributing: c.checksContributing,
    })),
    deductions: allDeductions,
    notEvaluatedRules,
    totalPoints,
    maxScore,
    scoreOutOf10,
    evaluationsComplete,
    perfectEligible,
    hardFailures,
  };
}
