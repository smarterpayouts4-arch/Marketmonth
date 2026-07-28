import { z } from "zod";

const confidenceSchema = z.enum(["high", "medium", "low"]);
const evidenceIdsSchema = z.array(z.string()).min(1).max(12);

/** Narrative prose — information transport; no per-field character ceilings. */
const narrativeString = z.string().min(1);

export const groundedOnlineMarketingStrategySchema = z.object({
  strategyThesis: z.object({
    headline: z.string().min(1).max(160),
    explanation: narrativeString,
    rationale: narrativeString,
    evidenceIds: evidenceIdsSchema,
    confidence: confidenceSchema,
  }),
  leadOffer: z.object({
    name: z.string().min(1).max(120),
    reason: narrativeString,
    evidenceIds: evidenceIdsSchema,
  }),
  audienceMessage: z.object({
    message: narrativeString,
    evidenceIds: evidenceIdsSchema,
  }),
  contentPillars: z
    .array(
      z.object({
        name: z.string().min(1).max(60),
        purpose: narrativeString,
        exampleTopics: z.array(narrativeString).min(1).max(4),
        evidenceIds: evidenceIdsSchema,
      })
    )
    .length(3),
  channelRoles: z
    .array(
      z.object({
        channel: z.string().min(1).max(40),
        role: narrativeString,
        status: z.enum(["detected", "recommended_test"]),
        rationale: narrativeString,
        evidenceIds: evidenceIdsSchema,
      })
    )
    .min(1)
    .max(3),
  firstCampaign: z.object({
    hook: narrativeString,
    premise: narrativeString,
    formats: z
      .array(
        z.object({
          format: z.string().min(1).max(40),
          angle: narrativeString,
        })
      )
      .min(1)
      .max(5),
    evidenceIds: evidenceIdsSchema,
  }),
  conversionPath: z.object({
    audienceAction: narrativeString,
    destination: narrativeString,
    primaryCta: narrativeString,
    rationale: narrativeString,
    evidenceIds: evidenceIdsSchema,
  }),
  postingRhythm: narrativeString,
  keyOpportunity: narrativeString,
  assumptions: z.array(z.string()).max(3),
});

export type GroundedOnlineMarketingStrategy = z.infer<
  typeof groundedOnlineMarketingStrategySchema
>;

export const aiGroundedStrategyResultSchema = z.object({
  strategyPreview: groundedOnlineMarketingStrategySchema,
});
