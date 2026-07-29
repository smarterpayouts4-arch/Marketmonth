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

/** Third-party product the company indexes/compares — never inventory. */
export const indexedProductSchema = z.object({
  name: z.string().min(1),
  price: z.string().optional(),
  sourceUrl: z.string().min(1),
});

export const brandProfileSchema = z.object({
  businessName: z.string(),
  website: z.string(),
  description: z.string(),
  audience: z.string(),
  /** Platform capabilities / offer positioning — not indexed third-party products. */
  products: z.array(z.string()),
  services: z.array(z.string()),
  /**
   * Indexed/compared third-party products. Must not be flattened into products[].
   * Default empty when absent (legacy profiles).
   */
  indexedProducts: z.array(indexedProductSchema).default([]),
  valueProposition: z.string(),
  brandVoice: z.string(),
  marketingOpportunity: z.string(),
  colors: z.array(z.string()),
  socialProfiles: z.array(socialProfileSchema),
  seoSummary: seoSummarySchema,
  competitors: z.array(competitorSchema),
  /**
   * Fields produced by LLM/rules overlay rather than observed crawl text.
   * Downstream must not use these as observed option labels or citable evidence.
   */
  derivedFieldNames: z.array(z.string()).optional(),
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
  /** Grounded growth option id (derived from content pillar investment). */
  growthDirection: z.string().min(1).max(80).optional(),
  growthThesis: z.string().min(1).max(400).optional(),
  buyerTension: z.string().min(1).max(200).optional(),
  brandCoreEdit: z.string().min(1).max(280).optional(),
  cadenceLevel: z.enum(["light", "consistent", "active", "daily"]).optional(),
  channels: z.array(z.string().min(1)).optional(),
});

export type StrategyIntent = z.infer<typeof strategyIntentSchema>;
