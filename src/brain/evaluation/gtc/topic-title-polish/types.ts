import type { MarketingFocus } from "@/brain/content/marketing-focus";
import type { TopicSubjectKind } from "../../topic-subject";

export const TOPIC_TITLE_POLISH_VERSION = "topic-title-polish-v1" as const;

/** Cheapest GPT-5 default; A/B vs mini before locking production. */
export const DEFAULT_TOPIC_TITLE_POLISH_MODEL = "gpt-5-nano" as const;

export type TopicTitleSource =
  | "deterministic-v2"
  | "openai-polished"
  | "openai-fallback";

/** Why OpenAI polish did not apply (provider-off is not a failure). */
export type TitlePolishFailureReason =
  | "missing_api_key"
  | "timeout"
  | "api_error"
  | "invalid_json"
  | "schema_mismatch"
  | "candidate_id_mismatch"
  | "title_validation_rejected"
  | "no_eligible_candidates";

export type TopicTitlePolishReason =
  | "grammar"
  | "objective_framing"
  | "concreteness"
  | "rhythm"
  | "duplicate_reduction"
  | "unchanged";

export type TopicTitlePolishCandidateInput = {
  candidateId: string;
  originalTitle: string;
  primaryLabel: string;
  primaryKind: TopicSubjectKind;
  comparisonAttribute?: string;
  audienceProblem?: string;
  platformCapability?: string;
  brandPosition?: string;
  allowedFacts: string[];
  /** Grounded aliases the model may use; never invented by the model. */
  approvedAliases: string[];
  forbiddenEntities: string[];
};

export type TopicTitlePolishInput = {
  objective: MarketingFocus;
  companyName?: string;
  companyCategory?: string;
  candidates: TopicTitlePolishCandidateInput[];
};

export type TopicTitlePolishOutputCandidate = {
  candidateId: string;
  polishedTitle: string;
  polishReason: TopicTitlePolishReason;
};

export type TopicTitlePolishOutput = {
  version: typeof TOPIC_TITLE_POLISH_VERSION;
  candidates: TopicTitlePolishOutputCandidate[];
};
