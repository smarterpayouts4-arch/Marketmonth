import { z } from "zod";

/**
 * Discriminated review decisions — never collapse to a single `approved` boolean.
 * Gate 2 UI remains Partial; schema is COMPLETE for type safety.
 */
export const REVIEW_DECISION_SCHEMA_VERSION = "review-decision-v1" as const;

const base = {
  schemaVersion: z.literal(REVIEW_DECISION_SCHEMA_VERSION),
  decidedAt: z.string().min(1),
  actor: z.enum(["human", "system"]),
  notes: z.string().optional(),
};

export const reviewDecisionSchema = z.discriminatedUnion("decisionType", [
  z.object({
    ...base,
    decisionType: z.literal("direction_select"),
    generationId: z.string().min(1),
    selectedVariationId: z.string().min(1),
  }),
  z.object({
    ...base,
    decisionType: z.literal("content_accept"),
    artifactId: z.string().min(1),
  }),
  z.object({
    ...base,
    decisionType: z.literal("content_reject"),
    artifactId: z.string().min(1),
    reason: z.string().min(1),
  }),
  z.object({
    ...base,
    decisionType: z.literal("regeneration_request"),
    artifactId: z.string().min(1),
    scope: z.enum(["directions", "atom", "channel_package"]),
  }),
  z.object({
    ...base,
    decisionType: z.literal("publication_approval"),
    artifactId: z.string().min(1),
    channel: z.string().min(1),
  }),
  z.object({
    ...base,
    decisionType: z.literal("doctrine_change_approval"),
    documentPath: z.string().min(1),
  }),
]);

export type ReviewDecision = z.infer<typeof reviewDecisionSchema>;
