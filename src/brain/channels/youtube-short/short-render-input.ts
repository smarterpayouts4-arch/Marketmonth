import { z } from "zod";

/**
 * Channel-constructed, provider-neutral Short image render input.
 * Mapped to GenericRenderRequest before calling the shared renderer.
 */
export const shortRenderInputSchema = z.object({
  requestId: z.string().min(1).max(128),
  channel: z.literal("youtube_short"),
  formatId: z.literal("youtube_short"),
  atomId: z.string().min(1).max(128),
  sceneId: z.string().min(1).max(128),
  sceneRevision: z.union([z.string().min(1).max(128), z.number()]),
  outputKind: z.literal("image"),
  aspectRatio: z.literal("9:16"),
  effectivePrompt: z.string().min(1).max(20_000),
  promptHash: z.string().min(8).max(128),
  requestedAt: z.string().datetime(),
});

export type ShortRenderInput = z.infer<typeof shortRenderInputSchema>;

export function shortRenderInputToGenericRequest(input: ShortRenderInput) {
  return {
    requestId: input.requestId,
    mediaKind: "image" as const,
    prompt: input.effectivePrompt,
    aspectRatio: input.aspectRatio,
    source: {
      channel: input.channel,
      formatId: input.formatId,
      atomId: input.atomId,
      sceneId: input.sceneId,
      revision: input.sceneRevision,
    },
    promptHash: input.promptHash,
    requestedAt: input.requestedAt,
  };
}
