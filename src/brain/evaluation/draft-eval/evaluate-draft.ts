import {
  EVALUATION_RESULT_SCHEMA_VERSION,
  evaluationResultSchema,
  type EvaluationMetricResult,
  type EvaluationResult,
} from "@/brain/contracts";
import type { ContentAtom } from "@/brain/atom";
import type { ContentBrainContext } from "@/brain/content/types";
import type { YouTubeShortPackage } from "@/brain/channels/youtube-short";

export const DRAFT_EVALUATOR_VERSION = "draft-eval-v1" as const;
export const MAX_DRAFT_REVISIONS = 1;

export type DraftEvalInput = {
  artifactId: string;
  atom: ContentAtom;
  context: ContentBrainContext;
  channelPackage?: YouTubeShortPackage;
  masterTitle?: string;
  audienceHint?: string;
};

function worst(
  statuses: EvaluationMetricResult["status"][]
): EvaluationMetricResult["status"] {
  if (statuses.includes("FAIL")) return "FAIL";
  if (statuses.includes("WARNING")) return "WARNING";
  return "PASS";
}

/**
 * Deterministic draft evaluation — PASS / FAIL / WARNING only.
 */
export function evaluateDraft(input: DraftEvalInput): EvaluationResult {
  const metrics: EvaluationMetricResult[] = [];

  const evidenceIds = new Set(Object.keys(input.context.evidenceById ?? {}));
  const proofs = input.atom.supporting_proof ?? [];
  const unsupported = proofs
    .map((p) => p.evidence_id)
    .filter((id) => id.startsWith("ev_") && !evidenceIds.has(id));
  const groundingOk = proofs.length > 0 && unsupported.length === 0;
  metrics.push({
    id: "brand_grounding",
    status: groundingOk ? "PASS" : "FAIL",
    evidence: groundingOk
      ? proofs.map((p) => `proof:${p.proof_id}->${p.evidence_id}`)
      : unsupported.length
        ? unsupported.map((id) => `unsupported:${id}`)
        : ["missing supporting_proof"],
    message: groundingOk
      ? "Every supporting proof maps to Brand Core evidence"
      : "Missing proof or unknown evidence IDs",
    revisionInstruction: groundingOk
      ? undefined
      : "Map every factual proof to an approved evidence ID from Brand Core",
  });

  const audienceText = [
    input.atom.audience?.problem,
    input.atom.audience?.state,
    input.audienceHint,
    input.context.audience,
  ]
    .filter(Boolean)
    .join(" ");
  metrics.push({
    id: "audience_specificity",
    status: audienceText.trim().length >= 8 ? "PASS" : "WARNING",
    evidence: [audienceText.trim() || "(empty)"],
    message:
      audienceText.trim().length >= 8
        ? "Audience need/constraint present"
        : "Audience specificity weak",
    revisionInstruction:
      audienceText.trim().length >= 8
        ? undefined
        : "Name at least one approved audience need, constraint, or intent",
  });

  const master = input.masterTitle ?? input.atom.master_topic ?? "";
  const atomTopic = input.atom.master_topic ?? "";
  const masterOk =
    !master ||
    !atomTopic ||
    atomTopic.toLowerCase().includes(master.toLowerCase().slice(0, 24)) ||
    master.toLowerCase().includes(atomTopic.toLowerCase().slice(0, 24));
  metrics.push({
    id: "master_topic_preservation",
    status: masterOk ? "PASS" : "FAIL",
    evidence: [`master=${master}`, `atom=${atomTopic}`],
    message: masterOk ? "Master topic preserved" : "Master topic drifted",
    revisionInstruction: masterOk
      ? undefined
      : "Restore the locked master topic wording in the draft",
  });

  if (input.channelPackage) {
    const scenes = input.channelPackage.scenes?.length ?? 0;
    metrics.push({
      id: "channel_format_compliance",
      status: scenes >= 1 ? "PASS" : "FAIL",
      evidence: [`scenes=${scenes}`],
      message:
        scenes >= 1
          ? "YouTube Short structure present"
          : "Channel package missing scenes",
      revisionInstruction:
        scenes >= 1 ? undefined : "Regenerate channel package with required scenes",
    });
  }

  const safetyBlob = JSON.stringify(input.atom).toLowerCase();
  const prohibited =
    /\bcures?\b|\bguaranteed\b|\bclinically proven to\b/.test(safetyBlob);
  metrics.push({
    id: "safety_policy",
    status: prohibited ? "FAIL" : "PASS",
    evidence: prohibited ? ["prohibited wording detected"] : ["no prohibited patterns"],
    message: prohibited ? "Safety policy failed" : "Safety policy OK",
    revisionInstruction: prohibited
      ? "Remove cure/guarantee/overclaim language"
      : undefined,
  });

  const status = worst(metrics.map((m) => m.status));
  return evaluationResultSchema.parse({
    schemaVersion: EVALUATION_RESULT_SCHEMA_VERSION,
    artifactId: input.artifactId,
    evaluatorVersion: DRAFT_EVALUATOR_VERSION,
    metrics,
    status,
    humanReviewRequired: status !== "PASS",
    createdAt: new Date().toISOString(),
  });
}

/**
 * Bounded revise loop: evaluate → (optional one revision hook) → evaluate.
 * Caller supplies reviseOnce; this function never loops unboundedly.
 */
export function evaluateWithBoundedRevision(input: {
  initial: DraftEvalInput;
  reviseOnce?: (failed: EvaluationResult) => DraftEvalInput;
}): {
  result: EvaluationResult;
  revisionCount: number;
  finalAction: "pass" | "human_review";
} {
  let current = input.initial;
  let result = evaluateDraft(current);
  let revisionCount = 0;
  if (result.status !== "PASS" && input.reviseOnce && revisionCount < MAX_DRAFT_REVISIONS) {
    current = input.reviseOnce(result);
    revisionCount += 1;
    result = evaluateDraft(current);
  }
  return {
    result,
    revisionCount,
    finalAction: result.status === "PASS" ? "pass" : "human_review",
  };
}
