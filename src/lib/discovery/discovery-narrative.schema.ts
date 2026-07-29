/**
 * UI-safe social discovery narrative contract.
 * Engine builds this; presentation formats it — never invents facts.
 */
import { z } from "zod";

export const discoveryClassificationSchema = z.enum([
  "observed",
  "inferred",
  "recommended",
]);
export type DiscoveryClassification = z.infer<
  typeof discoveryClassificationSchema
>;

export const discoveryConfidenceSchema = z.enum(["high", "medium", "low"]);
export type DiscoveryConfidence = z.infer<typeof discoveryConfidenceSchema>;

export const discoveryEvidenceRefSchema = z.object({
  field: z.string().min(1),
  sourceUrl: z.string().min(1),
  evidenceType: discoveryClassificationSchema,
  confidence: discoveryConfidenceSchema,
  excerpt: z.string().optional(),
});
export type DiscoveryEvidenceRef = z.infer<typeof discoveryEvidenceRefSchema>;

/**
 * Optional display-only wording for a bullet's card row. Produced by the copy
 * polish step and preferred by the UI when present; absent means the UI derives
 * the row copy deterministically. Never affects `text`, `classification`, or
 * `evidence`.
 */
export const discoveryDisplayCopySchema = z.object({
  title: z.string().min(1).max(80),
  summary: z.string().min(1).max(260),
});
export type DiscoveryDisplayCopy = z.infer<typeof discoveryDisplayCopySchema>;

export const discoveryBulletSchema = z.object({
  text: z.string().min(1),
  classification: discoveryClassificationSchema,
  evidence: z.array(discoveryEvidenceRefSchema).min(1),
  display: discoveryDisplayCopySchema.optional(),
});
export type DiscoveryBullet = z.infer<typeof discoveryBulletSchema>;

export const discoverySectionIdSchema = z.enum([
  "doing-well",
  "win",
  "content-play",
]);
export type DiscoverySectionId = z.infer<typeof discoverySectionIdSchema>;

export const discoverySectionSchema = z.object({
  id: discoverySectionIdSchema,
  label: z.string().min(1),
  subheading: z.string().min(1),
  headline: z.string().min(1),
  bullets: z.array(discoveryBulletSchema).min(1).max(5),
  socialMeaning: z.string().optional(),
  reveal: z.string().min(1),
  transition: z.string().optional(),
});
export type DiscoverySection = z.infer<typeof discoverySectionSchema>;

export const cadenceLevelSchema = z.enum([
  "light",
  "consistent",
  "active",
  "daily",
]);
export type CadenceLevel = z.infer<typeof cadenceLevelSchema>;

export const cadenceRecommendationSchema = z.object({
  level: cadenceLevelSchema,
  label: z.string().min(1),
  postsPerWeekRange: z.tuple([z.number().int().positive(), z.number().int().positive()]),
  description: z.string().min(1),
  rationale: z.array(z.string().min(1)).min(1),
  classification: z.literal("recommended"),
});
export type CadenceRecommendation = z.infer<typeof cadenceRecommendationSchema>;

export const contentUniverseObjectiveSchema = z.enum([
  "awareness",
  "education",
  "trust",
  "consideration",
  "conversion",
]);
export type ContentUniverseObjective = z.infer<
  typeof contentUniverseObjectiveSchema
>;

export const contentUniversePieceSchema = z.object({
  dayOffset: z.number().int().nonnegative(),
  platform: z.string().min(1),
  format: z.string().min(1),
  hook: z.string().min(1),
  angle: z.string().min(1),
  objective: contentUniverseObjectiveSchema,
  evidenceRefs: z.array(z.string().min(1)).min(1),
});
export type ContentUniversePiece = z.infer<typeof contentUniversePieceSchema>;

export const contentUniverseSchema = z.object({
  coreTopic: z.string().min(1),
  strategicPurpose: z.string().min(1),
  audienceProblem: z.string().min(1),
  pieces: z.array(contentUniversePieceSchema).min(1),
});
export type ContentUniverse = z.infer<typeof contentUniverseSchema>;

export const contentPillarSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  evidence: z.array(discoveryEvidenceRefSchema).min(1),
});
export type ContentPillar = z.infer<typeof contentPillarSchema>;

export const platformAdaptationSchema = z.object({
  platform: z.string().min(1),
  status: z.enum(["link-detected", "link-not-detected"]),
  sourceUrl: z.string().optional(),
  formats: z.array(z.string().min(1)).min(1),
  guidance: z.string().min(1),
  classification: discoveryClassificationSchema,
});
export type PlatformAdaptation = z.infer<typeof platformAdaptationSchema>;

export const detectedChannelSchema = z.object({
  platform: z.string().min(1),
  status: z.enum(["link-detected", "link-not-detected"]),
  sourceUrl: z.string().optional(),
});
export type DetectedChannel = z.infer<typeof detectedChannelSchema>;

export const socialDiscoveryProfileSchema = z.object({
  businessName: z.string().min(1),
  introHeadline: z.string().min(1),
  introDescription: z.string().min(1),
  sections: z.tuple([
    discoverySectionSchema,
    discoverySectionSchema,
    discoverySectionSchema,
  ]),
  contentPillars: z.array(contentPillarSchema).min(1).max(5),
  platformAdaptations: z.array(platformAdaptationSchema).min(1),
  detectedChannels: z.array(detectedChannelSchema),
  cadence: cadenceRecommendationSchema,
  contentUniversePreview: contentUniverseSchema,
  finalDirection: z.string().min(1),
  investmentQuestion: z.string().min(1),
  primaryCta: z.string().min(1),
  secondaryCta: z.string().min(1),
  evidenceQuality: z.enum(["strong", "moderate", "low"]),
});
export type SocialDiscoveryProfile = z.infer<
  typeof socialDiscoveryProfileSchema
>;
