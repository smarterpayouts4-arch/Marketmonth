import { GoogleGenAI } from "@google/genai";

import {
  ImageConfigError,
  requireGeminiImageConfig,
  type GeminiImageConfigResolved,
} from "../config/image-provider-config";
import type { GenericRenderRequest } from "../contracts";
import {
  assertImageByteBudget,
  assertPortraitOrientation,
  ImageBytesError,
  normalizeMimeType,
  readImageDimensions,
  type ImageDimensions,
} from "./image-bytes";

export type GeneratedImageMedia = {
  bytes: Buffer;
  mimeType: string;
  width?: number;
  height?: number;
  model: string;
  provider: string;
  durationMs: number;
};

export type GeminiGenerateDeps = {
  config?: GeminiImageConfigResolved;
  /** Test injection — bypasses GoogleGenAI. */
  generateContent?: (input: {
    model: string;
    prompt: string;
    aspectRatio: string;
  }) => Promise<{
    inlineData?: { data?: string; mimeType?: string };
  }>;
};

function mapProviderError(err: unknown): never {
  if (err instanceof ImageConfigError || err instanceof ImageBytesError) {
    throw err;
  }
  const message =
    err instanceof Error ? err.message.slice(0, 400) : "Image provider failed";
  const lower = message.toLowerCase();
  if (
    lower.includes("401") ||
    lower.includes("403") ||
    lower.includes("api key") ||
    lower.includes("permission")
  ) {
    throw new ImageBytesError(
      "image_provider_auth_failed",
      "Image provider authentication failed",
      false
    );
  }
  if (lower.includes("429") || lower.includes("rate")) {
    throw new ImageBytesError(
      "image_provider_rate_limited",
      "Image provider rate limited",
      true
    );
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    throw new ImageBytesError(
      "image_provider_timeout",
      "Image provider timed out",
      true
    );
  }
  if (
    lower.includes("safety") ||
    lower.includes("blocked") ||
    lower.includes("rejected")
  ) {
    throw new ImageBytesError(
      "image_provider_rejected_prompt",
      "Image provider rejected the prompt",
      false
    );
  }
  throw new ImageBytesError(
    "unknown_image_generation_failure",
    message,
    true
  );
}

async function defaultGenerateContent(input: {
  model: string;
  prompt: string;
  aspectRatio: string;
  apiKey: string;
}): Promise<{ inlineData?: { data?: string; mimeType?: string } }> {
  const ai = new GoogleGenAI({ apiKey: input.apiKey });
  const response = await ai.models.generateContent({
    model: input.model,
    contents: input.prompt,
    config: {
      responseModalities: ["IMAGE"],
      imageConfig: {
        aspectRatio: input.aspectRatio,
      },
    },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      return {
        inlineData: {
          data: part.inlineData.data,
          mimeType: part.inlineData.mimeType,
        },
      };
    }
  }
  return {};
}

/**
 * Generate one vertical image via Gemini. Returns bytes only — no storage.
 */
export async function generateGeminiImage(
  request: GenericRenderRequest,
  deps: GeminiGenerateDeps = {}
): Promise<GeneratedImageMedia> {
  const started = Date.now();
  const config = deps.config ?? requireGeminiImageConfig();
  if (request.aspectRatio !== "9:16") {
    throw new ImageBytesError(
      "image_provider_rejected_prompt",
      "Only 9:16 image generation is supported in this phase",
      false
    );
  }

  let raw: { inlineData?: { data?: string; mimeType?: string } };
  try {
    if (deps.generateContent) {
      raw = await deps.generateContent({
        model: config.model,
        prompt: request.prompt,
        aspectRatio: request.aspectRatio,
      });
    } else {
      raw = await defaultGenerateContent({
        model: config.model,
        prompt: request.prompt,
        aspectRatio: request.aspectRatio,
        apiKey: config.apiKey,
      });
    }
  } catch (err) {
    mapProviderError(err);
  }

  const b64 = raw.inlineData?.data?.trim();
  if (!b64) {
    throw new ImageBytesError(
      "image_provider_empty_output",
      "Image provider returned no image data",
      true
    );
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(b64, "base64");
  } catch {
    throw new ImageBytesError(
      "image_provider_invalid_output",
      "Image provider returned invalid image encoding",
      false
    );
  }

  assertImageByteBudget(bytes);
  const mimeType = normalizeMimeType(
    raw.inlineData?.mimeType || "image/png"
  );
  const dims: ImageDimensions | null = readImageDimensions(bytes);
  assertPortraitOrientation(dims);

  return {
    bytes,
    mimeType,
    width: dims?.width,
    height: dims?.height,
    model: config.model,
    provider: config.provider,
    durationMs: Date.now() - started,
  };
}
