import {
  generateVeoVideo,
  resolveVeoPollConfig,
  type GeneratedVeoVideo,
} from "./adapters/veo-video-generate";

/** Cheapest Veo 3.1 on Gemini API — do not scatter outside video config. */
export const VEO_VIDEO_MODEL_DEFAULT = "veo-3.1-lite-generate-preview";
export const VEO_VIDEO_RESOLUTION_DEFAULT = "720p";
export const VEO_VIDEO_ASPECT_RATIO_DEFAULT = "9:16";
/** Shorter clips cost less (billed per second). Override with MM_VIDEO_DURATION_SECONDS. */
export const VEO_VIDEO_DURATION_DEFAULT = 4;

export type VideoProviderConfig = {
  video_provider: string;
  video_model: string;
  resolution: string;
  aspectRatio: string;
  durationSeconds: number;
};

export type GeneratedVideoMedia = {
  status: "generated" | "stubbed" | "skipped";
  provider: string;
  model: string;
  asset_ref: string;
  prompt_used: string;
  resolution: string;
  aspectRatio: string;
  bytes?: Buffer;
  mimeType?: string;
  durationSeconds?: number;
};

export type VideoGenerateDeps = {
  /** Test injection — bypasses Veo adapter network. */
  generateVeo?: typeof generateVeoVideo;
};

function resolveVideoMode(): "live" | "stub" {
  const mode = process.env.MM_VIDEO_RENDER?.trim().toLowerCase();
  if (mode === "live") return "live";
  return "stub";
}

function resolveLiveProvider(providerConfig: VideoProviderConfig): string {
  return (
    providerConfig.video_provider?.trim().toLowerCase() ||
    process.env.MM_VIDEO_PROVIDER?.trim().toLowerCase() ||
    ""
  );
}

function resolveDurationSeconds(configured: number): number {
  const fromEnv = Number(process.env.MM_VIDEO_DURATION_SECONDS);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return Math.floor(fromEnv);
  if (configured > 0) return Math.floor(configured);
  return VEO_VIDEO_DURATION_DEFAULT;
}

/**
 * Generate scene motion video from a still + visual prompt.
 * Live only when MM_VIDEO_RENDER=live and MM_VIDEO_PROVIDER=veo
 * (no silent provider switch).
 */
export async function generateVideo(
  input: {
    prompt: string;
    imageBytes: Buffer;
    imageMimeType: string;
  },
  providerConfig: VideoProviderConfig,
  deps: VideoGenerateDeps = {}
): Promise<GeneratedVideoMedia> {
  const prompt = input.prompt.trim();
  if (!prompt) {
    return {
      status: "skipped",
      provider: providerConfig.video_provider,
      model: providerConfig.video_model,
      asset_ref: "",
      prompt_used: "",
      resolution: providerConfig.resolution,
      aspectRatio: providerConfig.aspectRatio,
    };
  }

  const mode = resolveVideoMode();
  if (mode !== "live") {
    return {
      status: "stubbed",
      provider: providerConfig.video_provider,
      model: providerConfig.video_model,
      asset_ref: "stub://video/scene-motion",
      prompt_used: prompt,
      resolution: providerConfig.resolution,
      aspectRatio: providerConfig.aspectRatio,
    };
  }

  const provider = resolveLiveProvider(providerConfig);
  if (provider !== "veo") {
    throw new Error(
      "MM_VIDEO_PROVIDER=veo is required when MM_VIDEO_RENDER=live (no silent default)"
    );
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required when MM_VIDEO_PROVIDER=veo");
  }
  if (!input.imageBytes.length) {
    throw new Error("Source still image bytes are required for image-to-video");
  }

  const model =
    providerConfig.video_model.trim() ||
    process.env.MM_VIDEO_MODEL?.trim() ||
    VEO_VIDEO_MODEL_DEFAULT;
  const resolution =
    providerConfig.resolution.trim() ||
    process.env.MM_VIDEO_RESOLUTION?.trim() ||
    VEO_VIDEO_RESOLUTION_DEFAULT;
  const aspectRatio =
    providerConfig.aspectRatio.trim() || VEO_VIDEO_ASPECT_RATIO_DEFAULT;
  const durationSeconds = resolveDurationSeconds(providerConfig.durationSeconds);
  const poll = resolveVeoPollConfig();

  const veo = deps.generateVeo ?? generateVeoVideo;
  const media: GeneratedVeoVideo = await veo(
    {
      prompt,
      imageBytes: input.imageBytes,
      imageMimeType: input.imageMimeType || "image/png",
    },
    {
      config: {
        apiKey,
        model,
        resolution,
        aspectRatio,
        durationSeconds,
        pollIntervalMs: poll.pollIntervalMs,
        maxPollAttempts: poll.maxPollAttempts,
      },
    }
  );

  return {
    status: "generated",
    provider: "veo",
    model: media.model,
    asset_ref: `memory://video/${media.bytes.length}`,
    prompt_used: media.promptUsed,
    resolution: media.resolution,
    aspectRatio: media.aspectRatio,
    bytes: media.bytes,
    mimeType: media.mimeType,
    ...(media.durationSeconds != null && media.durationSeconds > 0
      ? { durationSeconds: media.durationSeconds }
      : {}),
  };
}

export function defaultVideoProviderConfig(): VideoProviderConfig {
  const live = resolveVideoMode() === "live";
  const explicitProvider = process.env.MM_VIDEO_PROVIDER?.trim().toLowerCase();

  if (live && explicitProvider === "veo") {
    return {
      video_provider: "veo",
      video_model:
        process.env.MM_VIDEO_MODEL?.trim() || VEO_VIDEO_MODEL_DEFAULT,
      resolution:
        process.env.MM_VIDEO_RESOLUTION?.trim() || VEO_VIDEO_RESOLUTION_DEFAULT,
      aspectRatio: VEO_VIDEO_ASPECT_RATIO_DEFAULT,
      durationSeconds: resolveDurationSeconds(VEO_VIDEO_DURATION_DEFAULT),
    };
  }

  return {
    video_provider: explicitProvider || (live ? "" : "stub"),
    video_model:
      process.env.MM_VIDEO_MODEL?.trim() ||
      (live ? VEO_VIDEO_MODEL_DEFAULT : "stub-video-v1"),
    resolution:
      process.env.MM_VIDEO_RESOLUTION?.trim() || VEO_VIDEO_RESOLUTION_DEFAULT,
    aspectRatio: VEO_VIDEO_ASPECT_RATIO_DEFAULT,
    durationSeconds: resolveDurationSeconds(VEO_VIDEO_DURATION_DEFAULT),
  };
}
