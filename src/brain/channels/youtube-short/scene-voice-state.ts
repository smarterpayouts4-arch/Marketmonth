import { z } from "zod";

import { sceneRenderErrorSchema } from "./scene-render-state";

/**
 * Per-scene voiceover state (one-scene spike). Optional on older bundles.
 * Duration may be omitted (= Unverified).
 */
export const sceneVoiceStatusSchema = z.enum([
  "idle",
  "running",
  "succeeded",
  "stale",
  "failed",
  "stubbed",
]);

export const sceneVoiceStateSchema = z.object({
  status: sceneVoiceStatusSchema,
  provider: z.string().min(1).max(64).optional(),
  model: z.string().min(1).max(128).optional(),
  assetRef: z.string().min(1).max(2000).optional(),
  assetUrl: z.string().url().optional(),
  mimeType: z.string().min(1).max(80).optional(),
  /** Present when measured; omit = Unverified. */
  durationSeconds: z.number().positive().optional(),
  scriptUsed: z.string().max(1200).optional(),
  storageProvider: z.string().min(1).max(64).optional(),
  storageFileId: z.string().min(1).max(256).optional(),
  error: sceneRenderErrorSchema.optional(),
  attempt: z.number().int().nonnegative().optional(),
  requestedAt: z.string().datetime().optional(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type SceneVoiceState = z.infer<typeof sceneVoiceStateSchema>;
export type SceneVoiceStatus = z.infer<typeof sceneVoiceStatusSchema>;
