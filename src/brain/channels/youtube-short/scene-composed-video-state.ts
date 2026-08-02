import { z } from "zod";

import { sceneRenderErrorSchema } from "./scene-render-state";

/**
 * Per-scene composed Short MP4 (still + title + voice). Optional on older bundles.
 * Distinct from scene.video (Veo motion) and scene.render (still).
 */
export const sceneComposedVideoStatusSchema = z.enum([
  "idle",
  "running",
  "succeeded",
  "stale",
  "failed",
  "stubbed",
]);

export const sceneComposedVideoStateSchema = z.object({
  status: sceneComposedVideoStatusSchema,
  provider: z.string().min(1).max(64).optional(),
  compositor: z.string().min(1).max(64).optional(),
  assetRef: z.string().min(1).max(2000).optional(),
  assetUrl: z.string().url().optional(),
  mimeType: z.string().min(1).max(80).optional(),
  /** Present when measured/verified; omit = Unverified. */
  durationSeconds: z.number().positive().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  /** Still plate URL (compat / always the scene.render still). */
  sourceImageUrl: z.string().url().optional(),
  /** Actual FFmpeg visual plate URL (still or motion). */
  sourceVisualUrl: z.string().url().optional(),
  sourceVoiceUrl: z.string().url().optional(),
  voiceScriptUsed: z.string().max(1200).optional(),
  onScreenTextUsed: z.string().max(2000).optional(),
  storageProvider: z.string().min(1).max(64).optional(),
  storageFileId: z.string().min(1).max(256).optional(),
  error: sceneRenderErrorSchema.optional(),
  attempt: z.number().int().nonnegative().optional(),
  requestedAt: z.string().datetime().optional(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type SceneComposedVideoState = z.infer<
  typeof sceneComposedVideoStateSchema
>;
export type SceneComposedVideoStatus = z.infer<
  typeof sceneComposedVideoStatusSchema
>;
