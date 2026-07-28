import { z } from "zod";

export const intelligentMasterTopicSchema = z.object({
  topic: z.string().min(1).max(90),
  reason_summary: z.string().min(1).max(600),
  audience_problem_ids: z.array(z.string()).min(1).max(8),
  offer_ids: z.array(z.string()).max(8),
  claim_ids: z.array(z.string()).max(8),
  evidence_ids: z.array(z.string()).max(12),
});

export const intelligentDirectionSchema = z.object({
  direction_id: z.string().min(1).max(64),
  specific_topic: z.string().min(1).max(280),
  idea_summary: z.string().min(180).max(600),
  strategic_angle: z.string().min(1).max(160),
  audience_problem_ids: z.array(z.string()).min(1).max(8),
  claim_ids: z.array(z.string()).max(8),
  evidence_ids: z.array(z.string()).max(12),
  required_qualifiers: z.array(z.string()).max(16),
  differentiation_summary: z.string().min(1).max(280),
  /** When true, direction is educational framing without approved claims. */
  non_claim_educational: z.boolean().optional(),
});

export const intelligentDirectionsResultSchema = z.object({
  master_topic: intelligentMasterTopicSchema,
  directions: z.array(intelligentDirectionSchema).length(6),
});

export type IntelligentDirectionsResult = z.infer<
  typeof intelligentDirectionsResultSchema
>;
