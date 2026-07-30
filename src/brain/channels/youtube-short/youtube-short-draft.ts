import { z } from "zod";

import {
  YOUTUBE_SHORT_DURATION_DEFAULT_SECONDS,
  YOUTUBE_SHORT_DURATION_MAX_SECONDS,
  YOUTUBE_SHORT_SCENE_DURATION_MAX_SECONDS,
} from "./duration-policy";

/**
 * Normalized YouTube Short draft — convergence contract for:
 *   Manual prompt ─┐
 *                  ├→ YouTube Short channel → Renderer
 *   Content atom ──┘
 *
 * Package-level script remains the master script. Scene narration is the
 * spoken line for that scene only (not a full-script duplicate).
 */

export const youtubeShortDraftProvenanceSchema = z.discriminatedUnion(
  "source",
  [
    z.object({
      source: z.literal("atom"),
      atomId: z.string().min(1),
      atomRevision: z.number().int().positive(),
    }),
    z.object({
      source: z.literal("manual"),
      manualDraftId: z.string().min(1),
      companyId: z.string().min(1),
    }),
  ]
);

export const youtubeShortSceneAssetTypeSchema = z.enum(["image", "video"]);

export const youtubeShortDraftSceneSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().nonnegative(),
  durationSeconds: z
    .number()
    .positive()
    .max(YOUTUBE_SHORT_SCENE_DURATION_MAX_SECONDS),
  narration: z.string().min(1).max(1200),
  onScreenText: z.string().max(160).optional(),
  visualPrompt: z.string().min(1).max(800),
  assetType: youtubeShortSceneAssetTypeSchema.default("image"),
});

/**
 * Complete scene production snapshot stored on generatedBaseline.scenes.
 * Every scene id present at generate time gets a full entry.
 */
export const youtubeShortDurableSceneBaselineSchema = z.object({
  visualPrompt: z.string().min(1).max(800),
  narration: z.string().min(1).max(1200),
  onScreenText: z.string().max(160).optional(),
  assetType: youtubeShortSceneAssetTypeSchema,
});

/**
 * Field-level partial override for one scene (durableEdits.scenes[id]).
 * At least one field must be present.
 */
export const youtubeShortDurableSceneEditSchema = z
  .object({
    visualPrompt: z.string().min(1).max(800).optional(),
    narration: z.string().min(1).max(1200).optional(),
    onScreenText: z.string().max(160).optional(),
    assetType: youtubeShortSceneAssetTypeSchema.optional(),
  })
  .refine(
    (value) =>
      value.visualPrompt !== undefined ||
      value.narration !== undefined ||
      value.onScreenText !== undefined ||
      value.assetType !== undefined,
    { message: "scene edit must include at least one field" }
  );

/**
 * Durable edits persisted on the Short format package inside the existing
 * ContentProductionBundle. Package-level fields and scene overrides are all
 * optional so PATCH can send sparse updates; the service merges into existing
 * durableEdits (never replaces the whole scenes map blindly).
 */
export const youtubeShortDurableEditsSchema = z
  .object({
    imagePrompt: z.string().min(1).max(800).optional(),
    voiceoverPrompt: z.string().min(1).max(2000).optional(),
    script: z.string().min(1).max(6000).optional(),
    scenes: z
      .record(z.string().min(1), youtubeShortDurableSceneEditSchema)
      .optional(),
  })
  .refine(
    (value) =>
      value.imagePrompt !== undefined ||
      value.voiceoverPrompt !== undefined ||
      value.script !== undefined ||
      (value.scenes != null && Object.keys(value.scenes).length > 0),
    { message: "edits must include at least one field" }
  );

/**
 * Recoverable generate snapshot. Package prompt fields are complete; scenes
 * map is a complete snapshot keyed by stable scene id.
 */
export const youtubeShortGeneratedBaselineSchema = z.object({
  imagePrompt: z.string().min(1).max(800),
  voiceoverPrompt: z.string().min(1).max(2000),
  script: z.string().min(1).max(6000),
  scenes: z.record(z.string().min(1), youtubeShortDurableSceneBaselineSchema),
});

export const youtubeShortDraftSchema = z.object({
  formatId: z.literal("youtube_short"),
  aspectRatio: z.literal("9:16"),
  title: z.string().min(1).max(100),
  hook: z.string().min(1).max(280),
  script: z.string().min(1).max(6000),
  /** Actual summed scene duration; must be ≤ policy MAX. */
  durationSeconds: z
    .number()
    .positive()
    .max(YOUTUBE_SHORT_DURATION_MAX_SECONDS),
  /**
   * Generation / product aim. Defaults to MarketMonth initial default (60s),
   * not the policy ceiling.
   */
  targetDurationSeconds: z
    .number()
    .positive()
    .max(YOUTUBE_SHORT_DURATION_MAX_SECONDS)
    .default(YOUTUBE_SHORT_DURATION_DEFAULT_SECONDS),
  scenes: z.array(youtubeShortDraftSceneSchema).min(2).max(12),
  imagePrompt: z.string().min(1).max(800),
  voiceoverPrompt: z.string().min(1).max(2000),
  audienceAction: z.string().min(1).max(280).optional(),
  provenance: youtubeShortDraftProvenanceSchema,
});

export type YouTubeShortDraftProvenance = z.infer<
  typeof youtubeShortDraftProvenanceSchema
>;
export type YouTubeShortSceneAssetType = z.infer<
  typeof youtubeShortSceneAssetTypeSchema
>;
export type YouTubeShortDraftScene = z.infer<typeof youtubeShortDraftSceneSchema>;
export type YouTubeShortDurableSceneBaseline = z.infer<
  typeof youtubeShortDurableSceneBaselineSchema
>;
export type YouTubeShortDurableSceneEdit = z.infer<
  typeof youtubeShortDurableSceneEditSchema
>;
export type YouTubeShortDurableEdits = z.infer<
  typeof youtubeShortDurableEditsSchema
>;
export type YouTubeShortGeneratedBaseline = z.infer<
  typeof youtubeShortGeneratedBaselineSchema
>;
export type YouTubeShortDraft = z.infer<typeof youtubeShortDraftSchema>;
