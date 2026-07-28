import {
  imageProviderConfigSchema,
  type AssetSpec,
  type GeneratedImage,
  type ImageProviderConfig,
} from "./types";

/**
 * Provider layer for image generation.
 * Configure image_provider + image_model externally — do not hardwire Gemini 2.5.
 */
export async function generateImage(
  assetSpec: AssetSpec,
  providerConfig: ImageProviderConfig
): Promise<GeneratedImage> {
  const config = imageProviderConfigSchema.parse(providerConfig);

  // MVP: stub generation; wire real providers behind the same interface later.
  if (process.env.MM_IMAGE_RENDER === "live" && process.env.MM_IMAGE_API_KEY) {
    // Reserved for live provider HTTP call using config.image_provider/model
    return {
      status: "stubbed",
      provider: config.image_provider,
      model: config.image_model,
      asset_ref: `stub://image/${encodeURIComponent(assetSpec.purpose)}`,
      prompt_used: assetSpec.prompt,
    };
  }

  return {
    status: "stubbed",
    provider: config.image_provider,
    model: config.image_model,
    asset_ref: `stub://image/${encodeURIComponent(assetSpec.purpose)}`,
    prompt_used: assetSpec.prompt,
  };
}

export function defaultImageProviderConfig(): ImageProviderConfig {
  return {
    image_provider: process.env.MM_IMAGE_PROVIDER || "stub",
    image_model: process.env.MM_IMAGE_MODEL || "stub-image-v1",
  };
}
