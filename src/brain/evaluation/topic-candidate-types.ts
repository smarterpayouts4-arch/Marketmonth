import type { MarketingFocus } from "@/brain/content/marketing-focus";

import type {
  ClassificationConfidence,
  TopicSubjectKind,
} from "./topic-subject";

export const TOPIC_CANDIDATE_SCORE_VERSION =
  "topic-candidate-score-v2" as const;

export type TopicCandidateScore = {
  objectiveAlignment: number;
  subjectKindFit: number;
  contextGrounding: number;
  audienceRelevance: number;
  evidenceGrounding: number;
  specificity: number;
  novelty: number;
  clarity: number;
  overall: number;
};

/** Subject identity preserved through framing for Inspector / debug / migration. */
export type TopicCandidateSubjectIdentity = {
  label: string;
  kind: TopicSubjectKind;
  sourceField: string;
  evidenceIds: string[];
  classificationConfidence: ClassificationConfidence;
  /** brand_observed (default) vs industry_research */
  sourceType?: "brand_observed" | "industry_research";
};

export type TopicTitleSource =
  | "deterministic-v2"
  | "openai-polished"
  | "openai-fallback";

export type TitlePolishFailureReason =
  | "missing_api_key"
  | "timeout"
  | "api_error"
  | "invalid_json"
  | "schema_mismatch"
  | "candidate_id_mismatch"
  | "title_validation_rejected"
  | "no_eligible_candidates";

/** Ranked topic option before six-direction generation (Idea Lab). */
export type TopicCandidate = {
  topicId: string;
  rank: number;
  /** Display title (may be OpenAI-polished expression). */
  title: string;
  /** Deterministic title before optional polish — never overwritten. */
  originalTitle?: string;
  /**
   * deterministic-v2 = provider off or never polished.
   * openai-polished = accepted rewrite.
   * openai-fallback = polish enabled but failed (batch or systemic).
   */
  titleSource?: TopicTitleSource;
  titlePolishVersion?: string;
  titlePolishModel?: string;
  titlePolishReason?: string;
  /** Per-candidate polish failure (e.g. validation reject). */
  titlePolishFailureReason?: TitlePolishFailureReason;
  titlePolishFailureDetail?: string;
  objective: MarketingFocus;
  audience: string;
  audiencePain: string;
  strategicAngle: string;
  relevanceReasons: string[];
  evidenceIds: string[];
  /** Nested subject identity (canonical for Inspector). */
  subject: TopicCandidateSubjectIdentity;
  /** Flat mirrors of subject.* for existing UI consumers. */
  subjectKind: TopicSubjectKind;
  sourceFields: string[];
  classificationReason: string;
  classificationConfidence: ClassificationConfidence;
  score: TopicCandidateScore;
  scoreVersion: typeof TOPIC_CANDIDATE_SCORE_VERSION;
  recommended: boolean;
  /** Hooked Trigger metadata (topic-title-hook-v2). */
  titleHookVersion?: string;
  titleItchType?: string;
};

export type TopicGenerationWarning = {
  code: string;
  message: string;
};

export type TopicGenerationDiagnostic = {
  code: string;
  message: string;
};

export type TopicCandidateGenerationResult =
  | {
      status: "success";
      completeness: "complete";
      candidates: [
        TopicCandidate,
        TopicCandidate,
        TopicCandidate,
        TopicCandidate,
        TopicCandidate,
        TopicCandidate,
      ];
      warnings: [];
    }
  | {
      status: "success";
      completeness: "limited";
      /** Length 1–5 only — never padded to six. */
      candidates: TopicCandidate[];
      warnings: TopicGenerationWarning[];
    }
  | {
      status: "insufficient_context";
      candidates: [];
      diagnostic: TopicGenerationDiagnostic;
    };

export type IdeaLabCandidatesResult = {
  sessionId: string;
  objective: MarketingFocus;
  generation: TopicCandidateGenerationResult;
  /** Convenience mirror of generation.candidates (empty when insufficient). */
  candidates: TopicCandidate[];
  completeness?: "complete" | "limited";
  warnings: TopicGenerationWarning[];
  diagnostic?: TopicGenerationDiagnostic;
  fixtureHash: string;
  fixtureName: string;
  brandName: string;
  historyRepositoryPath: string;
  /** Candidate generation never writes Lab topic history. */
  historyWritten: false;
  scoreVersion: typeof TOPIC_CANDIDATE_SCORE_VERSION;
  /** Batch polish failure when provider was enabled (not set when provider off). */
  titlePolishFailureReason?: TitlePolishFailureReason;
  titlePolishFailureDetail?: string;
};

export const TOPIC_OBJECTIVE_REQUIRED = "TOPIC_OBJECTIVE_REQUIRED" as const;

export const INSUFFICIENT_PRODUCT_EDUCATION_SUBJECTS =
  "INSUFFICIENT_PRODUCT_EDUCATION_SUBJECTS" as const;
