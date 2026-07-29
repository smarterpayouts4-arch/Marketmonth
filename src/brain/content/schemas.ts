/**
 * Zod schemas for Content Brain handoff validation.
 * Dashboard and Content Production share this contract.
 */

import { z } from "zod";

import { REQUIRED_VARIATION_COUNT } from "./types";

const confidenceSchema = z.enum(["high", "medium", "low"]);

const safetyFlagsSchema = z.object({
  status: z.enum(["safe", "needs_review", "blocked"]),
  reasons: z.array(z.string()),
});

const masterTopicSchema = z.object({
  id: z.string().min(1),
  source: z.enum(["automatic", "manual"]),
  punchline: z.string(),
  subheading: z.string(),
  rationale: z.string(),
  evidenceIds: z.array(z.string()),
  confidence: confidenceSchema,
  safety: safetyFlagsSchema,
});

const contentVariationSchema = z.object({
  id: z.string().min(1),
  angle: z.enum([
    "beginner_guide",
    "faq",
    "problem_solution",
    "decision_guide",
    "comparison",
    "trust_transparency",
    "how_it_works",
    "action_oriented",
    "other",
  ]),
  punchline: z.string(),
  subheading: z.string(),
  brief: z.string(),
  audienceProblem: z.string().optional(),
  strategicPurpose: z.string(),
  ideaSummary: z.string().min(180).max(600).optional(),
  specificTopic: z.string().optional(),
  corePromise: z.string().optional(),
  suggestedFormat: z.string().optional(),
  suggestedCta: z.string().optional(),
  destination: z.string().optional(),
  evidenceIds: z.array(z.string()),
  claimIds: z.array(z.string()).optional(),
  audienceProblemIds: z.array(z.string()).optional(),
  differentiationSummary: z.string().optional(),
  assumptionIds: z.array(z.string()),
  confidence: confidenceSchema,
  safety: safetyFlagsSchema,
});

export const contentDirectionsHandoffV1Schema = z
  .object({
    version: z.literal(1),
    generationId: z.string().min(1),
    contextVersion: z.string().min(1),
    brand: z.object({
      name: z.string().min(1),
      domain: z.string().min(1),
    }),
    mode: z.enum(["automatic", "manual"]),
    masterTopic: masterTopicSchema,
    variations: z
      .array(contentVariationSchema)
      .length(REQUIRED_VARIATION_COUNT),
    selectedVariationId: z.string().min(1),
    selectedAt: z.string().min(1),
    topicCategory: z.string().optional(),
    marketingFocus: z.string().optional(),
    extraContextSummary: z.string().optional(),
  })
  .transform((data) => {
    const { marketingFocus, ...rest } = data;
    return {
      ...rest,
      topicCategory: rest.topicCategory ?? marketingFocus,
    };
  })
  .superRefine((data, ctx) => {
    if (!data.variations.some((v) => v.id === data.selectedVariationId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "selectedVariationId is not a member of variations",
        path: ["selectedVariationId"],
      });
    }
  });

export type ContentDirectionsHandoffV1Parsed = z.infer<
  typeof contentDirectionsHandoffV1Schema
>;
