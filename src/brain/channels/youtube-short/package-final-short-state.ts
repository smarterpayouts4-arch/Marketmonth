import { z } from "zod";

import { sceneRenderErrorSchema } from "./scene-render-state";

/**
 * Package-level assembled Short (ordered scene MP4s concatenated).
 * Distinct from per-scene composedVideo.
 */
export const packageFinalShortStatusSchema = z.enum([
  "idle",
  "running",
  "succeeded",
  "stale",
  "failed",
]);

export const packageFinalShortStateSchema = z.object({
  status: packageFinalShortStatusSchema,
  assetRef: z.string().min(1).max(2000).optional(),
  assetUrl: z.string().url().optional(),
  mimeType: z.string().min(1).max(80).optional(),
  durationSeconds: z.number().positive().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  /** Scene ids included, in concat order (alias of orderedSceneIds). */
  sceneIds: z.array(z.string().min(1)).optional(),
  /** Exact assembly inputs — must match computePackageAssemblyFingerprint. */
  orderedSceneIds: z.array(z.string().min(1)).optional(),
  orderedComposedAssetIds: z.array(z.string()).optional(),
  sourceHash: z.string().min(8).max(128).optional(),
  assemblyVersion: z.string().min(1).max(64).optional(),
  storageProvider: z.string().min(1).max(64).optional(),
  storageFileId: z.string().min(1).max(256).optional(),
  error: sceneRenderErrorSchema.optional(),
  attempt: z.number().int().nonnegative().optional(),
  requestedAt: z.string().datetime().optional(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type PackageFinalShortState = z.infer<
  typeof packageFinalShortStateSchema
>;
export type PackageFinalShortStatus = z.infer<
  typeof packageFinalShortStatusSchema
>;
