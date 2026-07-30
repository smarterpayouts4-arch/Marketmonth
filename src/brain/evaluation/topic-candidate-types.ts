import type { TopicCategoryId } from "@/brain/content/topic-category";

import type {
  BrainTraceStep,
  IdeaLabCandidatesGenerationTrace,
  IdeaLabEvidenceClaimView,
} from "./idea-lab.types";
import type {
  ClassificationConfidence,
  TopicSubjectKind,
} from "./topic-subject";
import type { TopicLlmFailureReason } from "./gtc/llm-candidates/types";

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
  rawSubject?: string;
  normalizedSubject?: string;
  subjectShape?: "question" | "noun" | "other";
};

export type TopicTitleSource = "deterministic-v2" | "llm-generated";

/** Ranked topic option before six-direction generation (Idea Lab). */
export type TopicCandidate = {
  topicId: string;
  rank: number;
  title: string;
  titleSource?: TopicTitleSource;
  /** Same as objective; explicit for LLM-enriched candidates. */
  categoryId?: TopicCategoryId;
  objective: TopicCategoryId;
  audience: string;
  audiencePain: string;
  strategicAngle: string;
  hook?: string;
  audienceQuestion?: string;
  whyItFits?: string;
  suggestedFormats?: string[];
  platformFit?: string[];
  funnelRole?: string;
  /** Canonical evidence ids (mirrors evidenceIds for LLM path). */
  evidenceRefs?: string[];
  confidence?: number;
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
  /** Per-component weighted breakdown (explainScore) — highest first. */
  scoreExplanation?: string[];
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
  objective: TopicCategoryId;
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
  /** Present when LLM candidate stage ran but fell back or partially failed. */
  llmFailureReason?: TopicLlmFailureReason;
  llmFailureDetail?: string;
  llmTokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  /** Evidence→candidate pipeline summary for Test Inspector. */
  generationTrace?: IdeaLabCandidatesGenerationTrace;
  /** All indexed evidence claims keyed by id (Inspector resolution). */
  evidenceClaimsById?: Record<string, IdeaLabEvidenceClaimView>;
  /** Stage-by-stage trace from the candidates run (when available). */
  candidateTrace?: BrainTraceStep[];
};

export const TOPIC_OBJECTIVE_REQUIRED = "TOPIC_OBJECTIVE_REQUIRED" as const;

export const INSUFFICIENT_PRODUCT_EDUCATION_SUBJECTS =
  "INSUFFICIENT_PRODUCT_EDUCATION_SUBJECTS" as const;

export const NO_PUBLISHED_COMMERCIAL_TERMS =
  "no_published_commercial_terms" as const;
