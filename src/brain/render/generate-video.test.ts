import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  VEO_VIDEO_MODEL_DEFAULT,
  VEO_VIDEO_RESOLUTION_DEFAULT,
  defaultVideoProviderConfig,
  generateVideo,
} from "./generate-video";

describe("generateVideo (Checkpoint D)", () => {
  const prev: Record<string, string | undefined> = {};
  const keys = [
    "MM_VIDEO_RENDER",
    "MM_VIDEO_PROVIDER",
    "MM_VIDEO_MODEL",
    "MM_VIDEO_RESOLUTION",
    "MM_VIDEO_DURATION_SECONDS",
    "GEMINI_API_KEY",
  ] as const;

  afterEach(() => {
    for (const k of keys) {
      if (prev[k] === undefined) delete process.env[k];
      else process.env[k] = prev[k];
      delete prev[k];
    }
  });

  function snapEnv() {
    for (const k of keys) {
      if (!(k in prev)) prev[k] = process.env[k];
    }
  }

  it("stubs by default without MM_VIDEO_RENDER=live", async () => {
    snapEnv();
    delete process.env.MM_VIDEO_RENDER;
    delete process.env.MM_VIDEO_PROVIDER;
    const result = await generateVideo(
      {
        prompt: "Gentle camera push-in on the product",
        imageBytes: Buffer.from("fake-png"),
        imageMimeType: "image/png",
      },
      defaultVideoProviderConfig()
    );
    assert.equal(result.status, "stubbed");
    assert.equal(result.asset_ref, "stub://video/scene-motion");
    assert.equal(result.bytes, undefined);
    assert.equal(result.prompt_used, "Gentle camera push-in on the product");
  });

  it("live with provider unset does not silently use Veo", async () => {
    snapEnv();
    process.env.MM_VIDEO_RENDER = "live";
    delete process.env.MM_VIDEO_PROVIDER;
    process.env.GEMINI_API_KEY = "gemini-test-key";
    await assert.rejects(
      () =>
        generateVideo(
          {
            prompt: "Orbit slowly",
            imageBytes: Buffer.from("fake-png"),
            imageMimeType: "image/png",
          },
          defaultVideoProviderConfig(),
          {
            generateVeo: async () => {
              throw new Error("Veo must not run when provider unset");
            },
          }
        ),
      /MM_VIDEO_PROVIDER=veo is required/
    );
  });

  it("live + MM_VIDEO_PROVIDER=veo uses Lite model by default", async () => {
    snapEnv();
    process.env.MM_VIDEO_RENDER = "live";
    process.env.MM_VIDEO_PROVIDER = "veo";
    process.env.GEMINI_API_KEY = "gemini-test-key";
    delete process.env.MM_VIDEO_MODEL;
    delete process.env.MM_VIDEO_RESOLUTION;
    const mp4 = Buffer.from("fake-mp4");
    const result = await generateVideo(
      {
        prompt: "Saved visual prompt only.",
        imageBytes: Buffer.from("still-bytes"),
        imageMimeType: "image/jpeg",
      },
      defaultVideoProviderConfig(),
      {
        generateVeo: async (input, deps = {}) => {
          assert.equal(input.prompt, "Saved visual prompt only.");
          assert.ok(input.imageBytes.equals(Buffer.from("still-bytes")));
          assert.equal(input.imageMimeType, "image/jpeg");
          const cfg = deps.config;
          assert.ok(cfg);
          assert.equal(cfg.apiKey, "gemini-test-key");
          assert.equal(cfg.model, VEO_VIDEO_MODEL_DEFAULT);
          assert.equal(cfg.resolution, VEO_VIDEO_RESOLUTION_DEFAULT);
          assert.equal(cfg.aspectRatio, "9:16");
          assert.equal(cfg.generateAudio, undefined);
          return {
            bytes: mp4,
            mimeType: "video/mp4",
            durationSeconds: cfg.durationSeconds,
            model: cfg.model,
            provider: "veo",
            promptUsed: input.prompt.trim(),
            resolution: cfg.resolution,
            aspectRatio: cfg.aspectRatio,
          };
        },
      }
    );
    assert.equal(result.status, "generated");
    assert.equal(result.provider, "veo");
    assert.equal(result.model, VEO_VIDEO_MODEL_DEFAULT);
    assert.equal(result.resolution, "720p");
    assert.equal(result.mimeType, "video/mp4");
    assert.equal(result.prompt_used, "Saved visual prompt only.");
    assert.ok(result.bytes?.equals(mp4));
  });

  it("defaultVideoProviderConfig uses veo only when explicitly set", () => {
    snapEnv();
    process.env.MM_VIDEO_RENDER = "live";
    process.env.MM_VIDEO_PROVIDER = "veo";
    delete process.env.MM_VIDEO_MODEL;
    const cfg = defaultVideoProviderConfig();
    assert.equal(cfg.video_provider, "veo");
    assert.equal(cfg.video_model, VEO_VIDEO_MODEL_DEFAULT);
    assert.equal(cfg.resolution, VEO_VIDEO_RESOLUTION_DEFAULT);
  });
});
