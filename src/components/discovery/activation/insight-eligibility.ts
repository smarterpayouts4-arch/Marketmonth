import type { DiscoveryEvidence } from "./types";
import { failsFiveCompanyTest } from "./generic-rejection";

export type InsightEligibilityInput = {
  insight: string;
  observed: DiscoveryEvidence[];
  /** When true, a single unusually explicit observation is enough. */
  hasExplicitObservation?: boolean;
  affectsDecision: boolean;
};

export type InsightEligibilityResult = {
  eligible: boolean;
  reasons: string[];
};

/**
 * Dominant insights must be evidence-backed. Strong interpretations are
 * demoted to fallbacks when the gate fails.
 */
export function evaluateInsightEligibility(
  input: InsightEligibilityInput
): InsightEligibilityResult {
  const reasons: string[] = [];
  const observedTexts = input.observed
    .map((e) => e.text.trim())
    .filter(Boolean);

  const observationOk =
    observedTexts.length >= 2 ||
    (Boolean(input.hasExplicitObservation) && observedTexts.length >= 1);

  if (!observationOk) {
    reasons.push("Need at least two website observations (or one explicit).");
  }
  if (!input.affectsDecision) {
    reasons.push("Does not affect positioning, audience, offer, or content.");
  }
  if (failsFiveCompanyTest(input.insight)) {
    reasons.push("Fails five-company specificity test.");
  }
  if (!input.insight.trim()) {
    reasons.push("Empty insight.");
  }

  // Evidence must be present under the reveal (caller supplies observed list).
  if (observedTexts.length === 0) {
    reasons.push("No supporting evidence available in the reveal.");
  }

  return {
    eligible: reasons.length === 0,
    reasons,
  };
}
