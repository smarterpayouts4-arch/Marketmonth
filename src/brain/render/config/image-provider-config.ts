/**
 * Server-only image provider configuration (Phase 4B).
 * Alias resolution lives here only — callers never read process.env for keys.
 */

export type ImageRenderMode = "dry_run" | "live";

export type ImageProviderConfigResolved = {
  mode: ImageRenderMode;
  provider: string;
  model: string;
  apiKeyConfigured: boolean;
  storageConfigured: boolean;
  liveAvailable: boolean;
  /** Missing variable names only — never values. */
  missing: string[];
};

export type ImageKitConfigResolved = {
  publicKey: string;
  privateKey: string;
  urlEndpoint: string;
};

export type GeminiImageConfigResolved = {
  apiKey: string;
  model: string;
  provider: string;
};

function trimEnv(name: string): string {
  return (process.env[name] ?? "").trim();
}

function hasValue(name: string): boolean {
  return trimEnv(name).length > 0;
}

/**
 * Resolve image render mode + capability without exposing secrets.
 */
export function resolveImageProviderConfig(): ImageProviderConfigResolved {
  const explicitMode = trimEnv("MM_IMAGE_RENDER").toLowerCase();
  const apiKeyConfigured =
    hasValue("MM_IMAGE_API_KEY") || hasValue("GEMINI_API_KEY");
  const modelConfigured =
    hasValue("MM_IMAGE_MODEL") || hasValue("GEMINI_IMAGE_MODEL");
  const storageConfigured =
    hasValue("IMAGEKIT_PUBLIC_KEY") &&
    hasValue("IMAGEKIT_PRIVATE_KEY") &&
    hasValue("IMAGEKIT_URL_ENDPOINT");

  const liveAvailable =
    apiKeyConfigured && modelConfigured && storageConfigured;

  // Safe default remains dry_run unless MM_IMAGE_RENDER=live is set.
  let mode: ImageRenderMode = "dry_run";
  if (explicitMode === "live" || explicitMode === "dry_run") {
    mode = explicitMode;
  }

  const provider =
    trimEnv("MM_IMAGE_PROVIDER") ||
    (mode === "live" ? "gemini" : "dry-run");
  const model =
    trimEnv("MM_IMAGE_MODEL") ||
    trimEnv("GEMINI_IMAGE_MODEL") ||
    (mode === "dry_run" ? "stub-image-v1" : "");

  const missing: string[] = [];
  if (mode === "live") {
    if (!apiKeyConfigured) {
      missing.push("MM_IMAGE_API_KEY|GEMINI_API_KEY");
    }
    if (!modelConfigured) {
      missing.push("MM_IMAGE_MODEL|GEMINI_IMAGE_MODEL");
    }
    if (!hasValue("IMAGEKIT_PUBLIC_KEY")) missing.push("IMAGEKIT_PUBLIC_KEY");
    if (!hasValue("IMAGEKIT_PRIVATE_KEY")) missing.push("IMAGEKIT_PRIVATE_KEY");
    if (!hasValue("IMAGEKIT_URL_ENDPOINT")) {
      missing.push("IMAGEKIT_URL_ENDPOINT");
    }
  }

  return {
    mode,
    provider,
    model,
    apiKeyConfigured,
    storageConfigured,
    liveAvailable,
    missing,
  };
}

/** Throws a safe config error (missing names only). */
export function requireGeminiImageConfig(): GeminiImageConfigResolved {
  const apiKey = trimEnv("MM_IMAGE_API_KEY") || trimEnv("GEMINI_API_KEY");
  const model = trimEnv("MM_IMAGE_MODEL") || trimEnv("GEMINI_IMAGE_MODEL");
  const provider = trimEnv("MM_IMAGE_PROVIDER") || "gemini";
  const missing: string[] = [];
  if (!apiKey) missing.push("MM_IMAGE_API_KEY|GEMINI_API_KEY");
  if (!model) missing.push("MM_IMAGE_MODEL|GEMINI_IMAGE_MODEL");
  if (missing.length > 0) {
    throw new ImageConfigError(
      "image_provider_not_configured",
      `Image provider not configured (missing: ${missing.join(", ")})`,
      false
    );
  }
  return { apiKey, model, provider };
}

export function requireImageKitConfig(): ImageKitConfigResolved {
  const publicKey = trimEnv("IMAGEKIT_PUBLIC_KEY");
  const privateKey = trimEnv("IMAGEKIT_PRIVATE_KEY");
  const urlEndpoint = trimEnv("IMAGEKIT_URL_ENDPOINT");
  const missing: string[] = [];
  if (!publicKey) missing.push("IMAGEKIT_PUBLIC_KEY");
  if (!privateKey) missing.push("IMAGEKIT_PRIVATE_KEY");
  if (!urlEndpoint) missing.push("IMAGEKIT_URL_ENDPOINT");
  if (missing.length > 0) {
    throw new ImageConfigError(
      "storage_not_configured",
      `Image storage not configured (missing: ${missing.join(", ")})`,
      false
    );
  }
  return { publicKey, privateKey, urlEndpoint };
}

export class ImageConfigError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, message: string, retryable: boolean) {
    super(message);
    this.name = "ImageConfigError";
    this.code = code;
    this.retryable = retryable;
  }
}

/** Safe serializable summary — never includes secrets. */
export function toSafeConfigSummary(
  config: ImageProviderConfigResolved
): Record<string, unknown> {
  return {
    mode: config.mode,
    provider: config.provider,
    model: config.model,
    apiKeyConfigured: config.apiKeyConfigured,
    storageConfigured: config.storageConfigured,
    liveAvailable: config.liveAvailable,
    missing: config.missing,
  };
}
