import { z } from "zod";

/**
 * Durable per-scene render state on the Short production package.
 * Optional — absent fields remain readable on older bundles.
 */
export const sceneRenderErrorSchema = z.object({
  code: z.string().min(1).max(80),
  message: z.string().min(1).max(500),
  retryable: z.boolean(),
});

export const sceneRenderStatusSchema = z.enum([
  "idle",
  "queued",
  "running",
  "dry_run_succeeded",
  "succeeded",
  "failed",
]);

export const sceneRenderStateSchema = z.object({
  status: sceneRenderStatusSchema,
  requestId: z.string().min(1).max(128).optional(),
  jobId: z.string().min(1).max(128).optional(),
  mode: z.enum(["dry_run", "live"]).optional(),
  provider: z.string().min(1).max(64).optional(),
  mediaKind: z.literal("image").optional(),
  promptHash: z.string().min(8).max(128).optional(),
  sourceRevision: z.union([z.string().min(1).max(128), z.number()]).optional(),
  attempt: z.number().int().nonnegative().optional(),
  assetRef: z.string().min(1).max(2000).optional(),
  assetUrl: z.string().url().optional(),
  mimeType: z.string().min(1).max(80).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  storageProvider: z.string().min(1).max(64).optional(),
  storageFileId: z.string().min(1).max(256).optional(),
  error: sceneRenderErrorSchema.optional(),
  requestedAt: z.string().datetime().optional(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type SceneRenderState = z.infer<typeof sceneRenderStateSchema>;
export type SceneRenderStatus = z.infer<typeof sceneRenderStatusSchema>;
