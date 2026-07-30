import { z } from "zod";

export const packageStatusSchema = z.enum([
  "not_started",
  "generating",
  "draft",
  "research_required",
  "ready_for_review",
  "approved",
  "failed",
]);

export type PackageStatus = z.infer<typeof packageStatusSchema>;

export const generationMetaSchema = z.object({
  provider: z.string().optional(),
  model: z.string().optional(),
  templateVersion: z.string().min(1),
  adapterVersion: z.string().min(1),
  generatedAt: z.string().optional(),
  idempotencyKey: z.string().min(1),
});

export const sceneCardSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().nonnegative(),
  durationSeconds: z.number().positive(),
  narration: z.string().min(1).max(1200),
  onScreenText: z.string().max(160).optional(),
  visualPrompt: z.string().min(1).max(800),
  transition: z.string().max(80).optional(),
  chapterId: z.string().optional(),
});

export const youtubeShortFormatPackageSchema = z.object({
  id: z.string().min(1),
  atomId: z.string().min(1),
  atomRevision: z.number().int().positive(),
  formatId: z.literal("youtube_short"),
  status: packageStatusSchema,
  title: z.string().min(1).max(100),
  durationSeconds: z.number().positive().max(90),
  aspectRatio: z.literal("9:16"),
  hook: z.string().min(1).max(280),
  voiceoverPrompt: z.string().min(1).max(2000),
  imagePrompt: z.string().min(1).max(800),
  script: z.string().min(1).max(6000),
  scenes: z.array(sceneCardSchema).min(2).max(12),
  caption: z.string().max(500).optional(),
  audienceAction: z.string().min(1).max(280),
  brandBridge: z.string().max(280).optional(),
  disclaimer: z.string().max(280).optional(),
  evidenceRefs: z.array(z.string()),
  unresolvedResearch: z.array(z.string()),
  warnings: z.array(z.string()),
  generation: generationMetaSchema,
});

export const videoChapterSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().nonnegative(),
  title: z.string().min(1).max(120),
  durationSeconds: z.number().positive(),
  narration: z.string().min(1).max(4000),
  visualPrompt: z.string().min(1).max(800),
  keyPoint: z.string().min(1).max(280),
});

export const youtubeVideoFormatPackageSchema = z.object({
  id: z.string().min(1),
  atomId: z.string().min(1),
  atomRevision: z.number().int().positive(),
  formatId: z.literal("youtube_video"),
  status: packageStatusSchema,
  title: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  durationSeconds: z.number().positive().max(900),
  aspectRatio: z.literal("16:9"),
  openingHook: z.string().min(1).max(400),
  voiceoverPrompt: z.string().min(1).max(4000),
  imagePrompt: z.string().min(1).max(800),
  script: z.string().min(1).max(20000),
  chapters: z.array(videoChapterSchema).min(2).max(10),
  scenes: z.array(sceneCardSchema).min(3).max(24),
  thumbnailPrompt: z.string().max(800).optional(),
  audienceAction: z.string().min(1).max(280),
  brandBridge: z.string().max(280).optional(),
  disclaimer: z.string().max(280).optional(),
  evidenceRefs: z.array(z.string()),
  unresolvedResearch: z.array(z.string()),
  warnings: z.array(z.string()),
  generation: generationMetaSchema,
});

export const contentFormatPackageSchema = z.discriminatedUnion("formatId", [
  youtubeShortFormatPackageSchema,
  youtubeVideoFormatPackageSchema,
]);

export type YouTubeShortFormatPackage = z.infer<
  typeof youtubeShortFormatPackageSchema
>;
export type YouTubeVideoFormatPackage = z.infer<
  typeof youtubeVideoFormatPackageSchema
>;
export type ContentFormatPackage = z.infer<typeof contentFormatPackageSchema>;

export const contentProductionBundleSchema = z.object({
  atomId: z.string().min(1),
  atomRevision: z.number().int().positive(),
  buildKey: z.string().min(1),
  companyId: z.string().min(1),
  packages: z.array(contentFormatPackageSchema).min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export type ContentProductionBundle = z.infer<
  typeof contentProductionBundleSchema
>;
