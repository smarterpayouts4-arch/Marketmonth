import { z } from "zod";

/**
 * Frozen baseline Directions Brain. Template-based; not an LLM prompt stack.
 * Future intelligent providers get new brain_version values (e.g. intelligent-v1).
 */
export const DIRECTIONS_BRAIN_VERSION = "deterministic-v1";
/**
 * Honest provenance: there is no LLM prompt for the baseline provider.
 * Use a real prompt id only when a provider actually sends one.
 */
export const DIRECTIONS_PROMPT_VERSION = "none";
/** Provider id stamped on history for the frozen baseline. */
export const DIRECTIONS_PROVIDER_ID = "deterministic-v1";
export const RECENT_HISTORY_LIMIT = 8;

export const topicGenerationModeSchema = z.enum([
  "automatic",
  "manual",
  "regenerate",
  "evaluation",
]);

export const topicRunPurposeSchema = z.enum([
  "product",
  "benchmark",
  "prompt_experiment",
  "model_experiment",
]);

export const topicGenerationStatusSchema = z.enum([
  "generated",
  "selected",
  "continued",
  "abandoned",
  "invalid",
]);

export const topicGenerationDirectionSchema = z.object({
  direction_id: z.string().min(1),
  position: z.number().int().min(1).max(6),
  specific_topic: z.string().min(1).max(280),
  idea_summary: z.string().min(180).max(600),
  editorial_angle: z.string().min(1).max(160),
  audience_problem: z.string().max(400),
  core_promise: z.string().max(280),
  suggested_creative_mode: z.string().max(80),
  evidence_ids: z.array(z.string()).max(12).optional(),
  claim_ids: z.array(z.string()).max(12).optional(),
  audience_problem_ids: z.array(z.string()).max(12).optional(),
  differentiation_summary: z.string().max(280).optional(),
  confidence: z.enum(["low", "medium", "high"]).optional(),
  safety_flags: z.array(z.string()).max(16).optional(),
});

export const directionsValidationReportSchema = z.object({
  validator_version: z.string().min(1),
  ok: z.boolean(),
  errors: z.array(z.string()),
});

export const generationProvenanceSchema = z.object({
  brain_version: z.string().min(1),
  prompt_version: z.string().min(1),
  provider: z.string().min(1),
  model: z.string().optional(),
  provider_config_hash: z.string().optional(),
  generation_code_version: z.string().optional(),
});

export const topicGenerationEvaluationSchema = z.object({
  review_status: z.enum(["not_reviewed", "reviewed", "benchmark"]),
  reviewer_id: z.string().optional(),
  overall_score: z.number().min(0).max(10).optional(),
  scores: z
    .object({
      specificity: z.number().min(0).max(10).optional(),
      distinctness: z.number().min(0).max(10).optional(),
      relevance: z.number().min(0).max(10).optional(),
      audience_alignment: z.number().min(0).max(10).optional(),
      evidence_grounding: z.number().min(0).max(10).optional(),
      hook_potential: z.number().min(0).max(10).optional(),
      usefulness: z.number().min(0).max(10).optional(),
      safety: z.number().min(0).max(10).optional(),
    })
    .optional(),
  flags: z
    .array(
      z.enum([
        "generic",
        "repetitive",
        "off_topic",
        "unsupported",
        "weak_promise",
        "poor_audience_fit",
        "unsafe_claim",
        "strong_output",
      ])
    )
    .optional(),
  notes: z.string().max(2000).optional(),
  compared_to_generation_id: z.string().optional(),
  preferred_over_comparison: z.boolean().optional(),
  evaluated_at: z.string().optional(),
});

export const topicGenerationNoveltyContextSchema = z.object({
  recent_generation_ids: z.array(z.string()),
  repeated_topic_allowed: z.boolean(),
});

export const topicGenerationRecordSchema = z.object({
  generation_id: z.string().min(1),
  company_id: z.string().min(1),
  domain: z.string().min(1),
  brand_core_id: z.string().min(1),
  brand_core_version: z.number().int().nonnegative(),
  brand_core_hash: z.string().min(1),
  mode: topicGenerationModeSchema,
  run_purpose: topicRunPurposeSchema,
  input_topic: z.string().optional(),
  normalized_input_topic: z.string().optional(),
  master_topic: z.string().min(1),
  master_topic_reason: z.string().max(600).optional(),
  /** Empty allowed when status is invalid (failed intelligent generation). */
  directions: z.array(topicGenerationDirectionSchema).min(0).max(6),
  selected_direction_id: z.string().optional(),
  parent_generation_id: z.string().optional(),
  comparison_group_id: z.string().optional(),
  experiment_id: z.string().optional(),
  status: topicGenerationStatusSchema,
  generation_provenance: generationProvenanceSchema,
  evaluation: topicGenerationEvaluationSchema.optional(),
  novelty_context: topicGenerationNoveltyContextSchema.optional(),
  /** Full intelligent result (valid or failed parse payload) before UI mapping. */
  intelligent_result: z.unknown().optional(),
  validation: directionsValidationReportSchema.optional(),
  record_revision: z.number().int().positive(),
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
});

export type TopicGenerationMode = z.infer<typeof topicGenerationModeSchema>;
export type TopicRunPurpose = z.infer<typeof topicRunPurposeSchema>;
export type TopicGenerationRecordStatus = z.infer<
  typeof topicGenerationStatusSchema
>;
export type TopicGenerationDirection = z.infer<
  typeof topicGenerationDirectionSchema
>;
export type TopicGenerationEvaluation = z.infer<
  typeof topicGenerationEvaluationSchema
>;
export type TopicGenerationNoveltyContext = z.infer<
  typeof topicGenerationNoveltyContextSchema
>;
export type TopicGenerationRecord = z.infer<typeof topicGenerationRecordSchema>;
export type GenerationProvenance = z.infer<typeof generationProvenanceSchema>;

export type RecentHistorySummaryItem = {
  generation_id: string;
  master_topic: string;
  status: TopicGenerationRecordStatus;
};

/** CSV column headers for the history file (adapter-owned). */
export const TOPIC_HISTORY_CSV_HEADERS = [
  "generation_id",
  "company_id",
  "domain",
  "brand_core_id",
  "brand_core_version",
  "brand_core_hash",
  "mode",
  "run_purpose",
  "input_topic",
  "normalized_input_topic",
  "master_topic",
  "master_topic_reason",
  "directions_json",
  "selected_direction_id",
  "parent_generation_id",
  "comparison_group_id",
  "experiment_id",
  "status",
  "brain_version",
  "prompt_version",
  "provider",
  "model",
  "provider_config_hash",
  "generation_code_version",
  "evaluation_json",
  "novelty_context_json",
  "intelligent_result_json",
  "validation_json",
  "record_revision",
  "created_at",
  "updated_at",
] as const;
