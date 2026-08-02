import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { GoogleGenAI, type GenerateVideosOperation } from "@google/genai";

export type GeneratedVeoVideo = {
  bytes: Buffer;
  mimeType: string;
  durationSeconds?: number;
  model: string;
  provider: "veo";
  promptUsed: string;
  resolution: string;
  aspectRatio: string;
};

export type VeoVideoConfig = {
  apiKey: string;
  model: string;
  resolution: string;
  aspectRatio: string;
  durationSeconds: number;
  /**
   * Enterprise-only. Developer API rejects the parameter even when false —
   * omit unless explicitly enabled for Gemini Enterprise Agent Platform.
   */
  generateAudio?: boolean;
  pollIntervalMs: number;
  maxPollAttempts: number;
};

export type VeoVideoGenerateInput = {
  prompt: string;
  imageBytes: Buffer;
  imageMimeType: string;
};

export type VeoVideoGenerateDeps = {
  config?: VeoVideoConfig;
  /** Test injection — bypasses GoogleGenAI network. */
  generate?: (input: {
    model: string;
    prompt: string;
    imageBytes: Buffer;
    imageMimeType: string;
    config: VeoVideoConfig;
  }) => Promise<GeneratedVeoVideo>;
};

const DEFAULT_POLL_MS = 10_000;
const DEFAULT_MAX_POLLS = 60;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadGeneratedVideo(input: {
  ai: GoogleGenAI;
  apiKey: string;
  video: { uri?: string; videoBytes?: string; mimeType?: string };
}): Promise<{ bytes: Buffer; mimeType: string }> {
  if (input.video.videoBytes) {
    return {
      bytes: Buffer.from(input.video.videoBytes, "base64"),
      mimeType: input.video.mimeType || "video/mp4",
    };
  }

  if (input.video.uri) {
    const url = new URL(input.video.uri);
    if (!url.searchParams.has("key")) {
      url.searchParams.set("key", input.apiKey);
    }
    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`Veo video download failed (${res.status})`);
    }
    const ab = await res.arrayBuffer();
    const mime =
      res.headers.get("content-type")?.split(";")[0]?.trim() ||
      input.video.mimeType ||
      "video/mp4";
    return { bytes: Buffer.from(ab), mimeType: mime };
  }

  const dir = await mkdtemp(path.join(tmpdir(), "mm-veo-"));
  const downloadPath = path.join(dir, "clip.mp4");
  try {
    await input.ai.files.download({
      file: input.video,
      downloadPath,
    });
    const bytes = await readFile(downloadPath);
    return {
      bytes,
      mimeType: input.video.mimeType || "video/mp4",
    };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function defaultGenerate(input: {
  model: string;
  prompt: string;
  imageBytes: Buffer;
  imageMimeType: string;
  config: VeoVideoConfig;
}): Promise<GeneratedVeoVideo> {
  const ai = new GoogleGenAI({ apiKey: input.config.apiKey });
  let operation: GenerateVideosOperation = await ai.models.generateVideos({
    model: input.model,
    prompt: input.prompt,
    image: {
      imageBytes: input.imageBytes.toString("base64"),
      mimeType: input.imageMimeType,
    },
    config: {
      numberOfVideos: 1,
      aspectRatio: input.config.aspectRatio,
      resolution: input.config.resolution,
      durationSeconds: input.config.durationSeconds,
      // Never send generateAudio:false — Developer API rejects the key entirely.
      ...(input.config.generateAudio === true
        ? { generateAudio: true as const }
        : {}),
    },
  });

  let attempts = 0;
  while (!operation.done) {
    attempts += 1;
    if (attempts > input.config.maxPollAttempts) {
      throw new Error(
        `Veo video generation timed out after ${input.config.maxPollAttempts} polls`
      );
    }
    await sleep(input.config.pollIntervalMs);
    operation = await ai.operations.getVideosOperation({ operation });
  }

  if (operation.error) {
    const errMessage = operation.error["message"];
    const message =
      typeof errMessage === "string"
        ? errMessage.slice(0, 300)
        : "Veo video generation failed";
    throw new Error(message);
  }

  const generated = operation.response?.generatedVideos?.[0]?.video;
  if (!generated) {
    throw new Error("Veo returned no generated video");
  }

  const downloaded = await downloadGeneratedVideo({
    ai,
    apiKey: input.config.apiKey,
    video: generated,
  });

  return {
    bytes: downloaded.bytes,
    mimeType: downloaded.mimeType,
    durationSeconds:
      input.config.durationSeconds > 0
        ? input.config.durationSeconds
        : undefined,
    model: input.model,
    provider: "veo",
    promptUsed: input.prompt,
    resolution: input.config.resolution,
    aspectRatio: input.config.aspectRatio,
  };
}

/**
 * Image-to-video via Gemini Veo. Returns MP4 bytes — does not upload or persist.
 */
export async function generateVeoVideo(
  input: VeoVideoGenerateInput,
  deps: VeoVideoGenerateDeps = {}
): Promise<GeneratedVeoVideo> {
  const prompt = input.prompt.trim();
  if (!prompt) {
    throw new Error("Veo video requires a non-empty visual prompt");
  }
  if (!input.imageBytes.length) {
    throw new Error("Veo video requires source image bytes");
  }

  const config = deps.config;
  if (!config?.apiKey?.trim()) {
    throw new Error("GEMINI_API_KEY is required when MM_VIDEO_PROVIDER=veo");
  }
  if (!config.model.trim()) {
    throw new Error("Veo model is required");
  }

  const run = deps.generate ?? defaultGenerate;
  return run({
    model: config.model,
    prompt,
    imageBytes: input.imageBytes,
    imageMimeType: input.imageMimeType || "image/png",
    config: {
      ...config,
      pollIntervalMs: config.pollIntervalMs || DEFAULT_POLL_MS,
      maxPollAttempts: config.maxPollAttempts || DEFAULT_MAX_POLLS,
    },
  });
}

export function resolveVeoPollConfig(): {
  pollIntervalMs: number;
  maxPollAttempts: number;
} {
  const pollRaw = Number(process.env.MM_VIDEO_POLL_MS);
  const maxRaw = Number(process.env.MM_VIDEO_MAX_POLLS);
  return {
    pollIntervalMs:
      Number.isFinite(pollRaw) && pollRaw >= 1000 ? pollRaw : DEFAULT_POLL_MS,
    maxPollAttempts:
      Number.isFinite(maxRaw) && maxRaw >= 1 ? maxRaw : DEFAULT_MAX_POLLS,
  };
}
