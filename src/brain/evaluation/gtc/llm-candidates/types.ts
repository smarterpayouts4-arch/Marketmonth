export type TopicLlmFailureReason =
  | "missing_api_key"
  | "timeout"
  | "api_error"
  | "invalid_json"
  | "schema_mismatch"
  | "grounding_rejected"
  | "no_eligible_candidates";

export const TOPIC_LLM_VALIDATOR_VERSION = "topic-llm-validate-v2" as const;

/** Structured rejection taxonomy — machine-readable, not prose-only. */
export type LlmCandidateRejectionCode =
  | "title_length"
  | "generic_or_meta_title"
  | "incomplete_sentence_title"
  | "product_name_only_title"
  | "medical_or_study_claim"
  | "outcome_claim_unattributed"
  | "ungrounded_number"
  | "evidence_refs_invalid"
  | "subject_mismatch"
  | "category_mismatch"
  | "unsafe_creative_field";

export type LlmCandidateRejection = {
  code: LlmCandidateRejectionCode;
  title: string;
  detail: string;
};

export type ValidatedLlmTopicCandidate = {
  title: string;
  hook?: string;
  audienceQuestion?: string;
  strategicAngle: string;
  whyItFits: string;
  suggestedFormats?: string[];
  platformFit?: string[];
  funnelRole?: string;
  evidenceRefs: string[];
  itchType?: string;
  confidence?: number;
};

export type FetchLlmTopicCandidatesResult =
  | {
      ok: true;
      candidates: ValidatedLlmTopicCandidate[];
      model: string;
      tokenUsage?: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
      };
      validatorVersion: typeof TOPIC_LLM_VALIDATOR_VERSION;
      /** Candidates rejected by validation while others were accepted. */
      rejections?: LlmCandidateRejection[];
      /** True when the one-shot repair retry produced this result. */
      repairUsed?: boolean;
    }
  | {
      ok: false;
      reason: TopicLlmFailureReason;
      detail?: string;
      model?: string;
      tokenUsage?: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
      };
      validatorVersion?: typeof TOPIC_LLM_VALIDATOR_VERSION;
      rejections?: LlmCandidateRejection[];
      repairUsed?: boolean;
    };
