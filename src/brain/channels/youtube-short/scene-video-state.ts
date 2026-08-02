import { z } from "zod";

import { SCENE_VISUAL_PROMPT_MAX_CHARS } from "./scene-field-limits";
import { sceneRenderErrorSchema } from "./scene-render-state";

/**
 * Per-scene Veo motion clip (image-to-video). Optional on older bundles.
 * Does not replace scene.render (still) or scene.voice.
 */
export const sceneVideoStatusSchema = z.enum([
  "idle",
  "running",
  "succeeded",
  "stale",
  "failed",
  "stubbed",
]);

export const sceneVideoStateSchema = z.object({
  status: sceneVideoStatusSchema,
  provider: z.string().min(1).max(64).optional(),
  model: z.string().min(1).max(128).optional(),
  assetRef: z.string().min(1).max(2000).optional(),
  assetUrl: z.string().url().optional(),
  mimeType: z.string().min(1).max(80).optional(),
  /** Present when measured; omit = Unverified. */
  durationSeconds: z.number().positive().optional(),
  resolution: z.string().min(1).max(16).optional(),
  promptUsed: z.string().max(SCENE_VISUAL_PROMPT_MAX_CHARS).optional(),
  sourceImageUrl: z.string().url().optional(),
  sourceImageRef: z.string().min(1).max(2000).optional(),
  storageProvider: z.string().min(1).max(64).optional(),
  storageFileId: z.string().min(1).max(256).optional(),
  error: sceneRenderErrorSchema.optional(),
  attempt: z.number().int().nonnegative().optional(),
  requestedAt: z.string().datetime().optional(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type SceneVideoState = z.infer<typeof sceneVideoStateSchema>;
export type SceneVideoStatus = z.infer<typeof sceneVideoStatusSchema>;
