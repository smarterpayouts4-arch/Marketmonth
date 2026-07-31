import { z } from "zod";

/**
 * Provider-neutral render contracts (Phase 4A).
 * Keep provider brand names out of this schema; adapters map later.
 */

export const renderMediaKindSchema = z.literal("image");

export const renderModeSchema = z.enum(["dry_run", "live"]);

export const renderExecutionStatusSchema = z.enum([
  "queued",
  "running",
  "succeeded",
  "failed",
]);

export const normalizedRenderErrorSchema = z.object({
  code: z.string().min(1).max(80),
  message: z.string().min(1).max(500),
  retryable: z.boolean(),
});

export type NormalizedRenderError = z.infer<typeof normalizedRenderErrorSchema>;

export const genericRenderRequestSchema = z.object({
  requestId: z.string().min(1).max(128),
  mediaKind: renderMediaKindSchema,
  prompt: z.string().min(1).max(20_000),
  aspectRatio: z.string().min(1).max(16),
  source: z.object({
    channel: z.string().min(1).max(64),
    formatId: z.string().min(1).max(64),
    atomId: z.string().min(1).max(128),
    sceneId: z.string().min(1).max(128),
    revision: z.union([z.string().min(1).max(128), z.number()]),
  }),
  promptHash: z.string().min(8).max(128),
  requestedAt: z.string().datetime(),
});

export type GenericRenderRequest = z.infer<typeof genericRenderRequestSchema>;

const baseResultFields = {
  requestId: z.string().min(1).max(128),
  rendererJobId: z.string().min(1).max(128),
  provider: z.string().min(1).max(64),
  mode: renderModeSchema,
  mediaKind: renderMediaKindSchema,
  providerMetadata: z.record(z.string(), z.unknown()).optional(),
  requestedAt: z.string().datetime(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
};

/**
 * Dry-run success must never carry assetRef/assetUrl.
 * Live success may (Phase 4B+).
 */
export const normalizedRenderResultSchema = z.discriminatedUnion("status", [
  z.object({
    ...baseResultFields,
    status: z.literal("queued"),
  }),
  z.object({
    ...baseResultFields,
    status: z.literal("running"),
  }),
  z
    .object({
      ...baseResultFields,
      status: z.literal("succeeded"),
      assetRef: z.string().min(1).max(2000).optional(),
      assetUrl: z.string().url().optional(),
    })
    .superRefine((value, ctx) => {
      if (value.mode === "dry_run") {
        if (value.assetRef !== undefined) {
          ctx.addIssue({
            code: "custom",
            message: "dry_run success must not include assetRef",
            path: ["assetRef"],
          });
        }
        if (value.assetUrl !== undefined) {
          ctx.addIssue({
            code: "custom",
            message: "dry_run success must not include assetUrl",
            path: ["assetUrl"],
          });
        }
      }
    }),
  z.object({
    ...baseResultFields,
    status: z.literal("failed"),
    error: normalizedRenderErrorSchema,
  }),
]);

export type NormalizedRenderResult = z.infer<
  typeof normalizedRenderResultSchema
>;

export type RenderMediaAdapter = {
  readonly id: string;
  render(request: GenericRenderRequest): Promise<NormalizedRenderResult>;
};
