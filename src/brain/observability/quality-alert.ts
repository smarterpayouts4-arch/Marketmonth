/**
 * Quality-drop alerting (P3.1).
 * Threshold checks over a finished topic generation; alerts are structured
 * console warnings (the alerting sink can later route them to a pager or
 * dashboard) and are also returned for trace embedding.
 */

export type QualityAlertCode =
  | "insufficient_context"
  | "low_candidate_count"
  | "llm_fallback"
  | "judge_low_score";

export type QualityAlert = {
  code: QualityAlertCode;
  severity: "warn" | "critical";
  detail: string;
};

const MIN_HEALTHY_CANDIDATES = 3;
const MIN_HEALTHY_JUDGE_OVERALL = 6;

export function evaluateTopicGenerationQuality(input: {
  status: string;
  candidateCount: number;
  llmFailureReason?: string;
  judgeOverall?: number;
}): QualityAlert[] {
  const alerts: QualityAlert[] = [];

  if (input.status === "insufficient_context") {
    alerts.push({
      code: "insufficient_context",
      severity: "critical",
      detail: "Generation returned insufficient_context — no usable slate",
    });
  } else if (input.candidateCount < MIN_HEALTHY_CANDIDATES) {
    alerts.push({
      code: "low_candidate_count",
      severity: "warn",
      detail: `Only ${input.candidateCount} candidates (healthy floor ${MIN_HEALTHY_CANDIDATES})`,
    });
  }

  if (input.llmFailureReason && input.llmFailureReason !== "missing_api_key") {
    alerts.push({
      code: "llm_fallback",
      severity: "warn",
      detail: `LLM path fell back deterministically: ${input.llmFailureReason}`,
    });
  }

  if (
    input.judgeOverall !== undefined &&
    input.judgeOverall < MIN_HEALTHY_JUDGE_OVERALL
  ) {
    alerts.push({
      code: "judge_low_score",
      severity: "warn",
      detail: `LLM judge overall ${input.judgeOverall} < ${MIN_HEALTHY_JUDGE_OVERALL}`,
    });
  }

  return alerts;
}

/** Structured sink — one warn line per alert, greppable as [quality-alert]. */
export function emitQualityAlerts(
  scope: string,
  alerts: QualityAlert[]
): void {
  for (const alert of alerts) {
    console.warn(
      `[quality-alert] scope=${scope} code=${alert.code} severity=${alert.severity} detail=${alert.detail}`
    );
  }
}
