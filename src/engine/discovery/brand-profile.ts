import { z } from "zod";

import {
  aiGroundedStrategyResultSchema,
  groundedOnlineMarketingStrategySchema,
  type GroundedOnlineMarketingStrategy,
} from "@/lib/discovery/strategy.schema";

export const socialPlatformSchema = z.enum([
  "instagram",
  "facebook",
  "linkedin",
  "tiktok",
  "youtube",
  "x",
]);

export const socialProfileSchema = z.object({
  platform: socialPlatformSchema,
  status: z.enum(["present", "missing"]),
  url: z.string().url().optional(),
});

export const competitorSchema = z.object({
  name: z.string(),
  reason: z.string(),
  website: z.string().optional(),
});

export const seoSummarySchema = z.object({
  metadataCompleteness: z.enum(["strong", "partial", "weak"]),
  pageSpeedNote: z.string(),
  technicalObservations: z.array(z.string()),
  contentOpportunities: z.array(z.string()),
});

/** Named catalog/SKU from structured discovery — never merge into products[]. */
export const catalogProductSchema = z.object({
  name: z.string().min(1),
  price: z.string().optional(),
  sourceUrl: z.string().min(1),
});

export const brandProfileSchema = z.object({
  businessName: z.string(),
  website: z.string(),
  description: z.string(),
  audience: z.string(),
  /** Platform capabilities / offer positioning — not catalog SKUs. */
  products: z.array(z.string()),
  services: z.array(z.string()),
  /**
   * First-class catalog / SKU signals. Must not be flattened into products[].
   * Default empty when absent (legacy profiles).
   */
  catalogProducts: z.array(catalogProductSchema).default([]),
  valueProposition: z.string(),
  brandVoice: z.string(),
  marketingOpportunity: z.string(),
  colors: z.array(z.string()),
  socialProfiles: z.array(socialProfileSchema),
  seoSummary: seoSummarySchema,
  competitors: z.array(competitorSchema),
});

export type BrandProfile = z.infer<typeof brandProfileSchema>;
export type SocialProfile = z.infer<typeof socialProfileSchema>;
export type SeoSummary = z.infer<typeof seoSummarySchema>;

/** @deprecated name — use GroundedOnlineMarketingStrategy */
export const strategyPreviewSchema = groundedOnlineMarketingStrategySchema;
export type StrategyPreview = GroundedOnlineMarketingStrategy;
export type { GroundedOnlineMarketingStrategy };

export const aiBrandProfileResultSchema = z.object({
  brandProfile: brandProfileSchema.omit({
    socialProfiles: true,
    seoSummary: true,
    colors: true,
    website: true,
  }),
});

export const aiStrategyResultSchema = aiGroundedStrategyResultSchema;

export const strategyIntentSchema = z.object({
  goal: z.enum(["awareness", "leads", "sales", "loyalty"]),
  promoteFirst: z.string().min(1),
  reach: z.enum(["local", "national", "online_broad"]),
  targetLocation: z.string().min(1).max(160).optional(),
  /** Grounded growth option id (dynamic string from activation profile). */
  growthDirection: z.string().min(1).max(80).optional(),
  growthThesis: z.string().min(1).max(400).optional(),
  buyerTension: z.string().min(1).max(200).optional(),
  brandCoreEdit: z.string().min(1).max(280).optional(),
});

export type StrategyIntent = z.infer<typeof strategyIntentSchema>;
