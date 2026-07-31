import { randomUUID } from "node:crypto";

import {
  ImageConfigError,
  resolveImageProviderConfig,
} from "../config/image-provider-config";
import {
  genericRenderRequestSchema,
  type GenericRenderRequest,
  type NormalizedRenderResult,
  type RenderMediaAdapter,
} from "../contracts";
import {
  generateGeminiImage,
  type GeminiGenerateDeps,
} from "./gemini-image-generate";
import { ImageBytesError } from "./image-bytes";
import {
  uploadGeneratedImageToImageKit,
  type ImageKitUploadDeps,
} from "./imagekit-upload";

export type LiveImageAdapterDeps = {
  gemini?: GeminiGenerateDeps;
  imagekit?: ImageKitUploadDeps;
};

function failResult(
  request: GenericRenderRequest,
  rendererJobId: string,
  err: { code: string; message: string; retryable: boolean },
  startedAt: string,
  provider: string
): NormalizedRenderResult {
  return {
    requestId: request.requestId,
    rendererJobId,
    provider,
    mode: "live",
    status: "failed",
    mediaKind: "image",
    error: err,
    requestedAt: request.requestedAt,
    startedAt,
    completedAt: new Date().toISOString(),
    providerMetadata: {
      promptLength: request.prompt.length,
      promptHashPrefix: request.promptHash.slice(0, 12),
    },
  };
}

/**
 * Live image adapter: Gemini generate → ImageKit store → normalized result.
 * Does not touch production bundles.
 */
export function createLiveImageAdapter(
  deps: LiveImageAdapterDeps = {}
): RenderMediaAdapter {
  return {
    id: "live-image",
    async render(request: GenericRenderRequest): Promise<NormalizedRenderResult> {
      const parsed = genericRenderRequestSchema.parse(request);
      const startedAt = new Date().toISOString();
      const rendererJobId = `live_${randomUUID()}`;
      const summary = resolveImageProviderConfig();

      if (summary.missing.length > 0) {
        return failResult(
          parsed,
          rendererJobId,
          {
            code: summary.apiKeyConfigured
              ? summary.storageConfigured
                ? "image_model_not_configured"
                : "storage_not_configured"
              : "image_provider_not_configured",
            message: `Live image generation not configured (missing: ${summary.missing.join(", ")})`,
            retryable: false,
          },
          startedAt,
          summary.provider
        );
      }

      try {
        const media = await generateGeminiImage(parsed, deps.gemini);
        const stored = await uploadGeneratedImageToImageKit(
          parsed,
          media,
          deps.imagekit
        );

        return {
          requestId: parsed.requestId,
          rendererJobId,
          provider: media.provider,
          mode: "live",
          status: "succeeded",
          mediaKind: "image",
          assetRef: stored.assetRef,
          assetUrl: stored.assetUrl,
          requestedAt: parsed.requestedAt,
          startedAt,
          completedAt: new Date().toISOString(),
          providerMetadata: {
            model: media.model,
            mimeType: stored.mimeType,
            width: stored.width,
            height: stored.height,
            bytes: stored.bytes,
            storageProvider: stored.storageProvider,
            storageFileId: stored.storageFileId,
            filePath: stored.filePath,
            generationMs: media.durationMs,
            uploadMs: stored.durationMs,
            promptLength: parsed.prompt.length,
            promptHashPrefix: parsed.promptHash.slice(0, 12),
          },
        };
      } catch (err) {
        if (err instanceof ImageConfigError || err instanceof ImageBytesError) {
          return failResult(
            parsed,
            rendererJobId,
            {
              code: err.code,
              message: err.message,
              retryable: err.retryable,
            },
            startedAt,
            summary.provider
          );
        }
        return failResult(
          parsed,
          rendererJobId,
          {
            code: "unknown_image_generation_failure",
            message:
              err instanceof Error
                ? err.message.slice(0, 400)
                : "Unknown image generation failure",
            retryable: true,
          },
          startedAt,
          summary.provider
        );
      }
    },
  };
}

export const defaultLiveImageAdapter = createLiveImageAdapter();
