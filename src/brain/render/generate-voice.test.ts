import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { defaultVoiceProviderConfig, generateVoice } from "./generate-voice";

describe("generateVoice (Checkpoint C)", () => {
  const prev: Record<string, string | undefined> = {};
  const keys = [
    "MM_VOICE_RENDER",
    "MM_VOICE_PROVIDER",
    "MM_VOICE_MODEL",
    "MM_VOICE_ID",
    "OPENAI_API_KEY",
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

  it("stubs by default without MM_VOICE_RENDER=live", async () => {
    snapEnv();
    delete process.env.MM_VOICE_RENDER;
    delete process.env.MM_VOICE_PROVIDER;
    const result = await generateVoice(
      "Why is magnesium getting so much attention?",
      defaultVoiceProviderConfig()
    );
    assert.equal(result.status, "stubbed");
    assert.equal(result.asset_ref, "stub://voice/narration");
    assert.equal(result.bytes, undefined);
  });

  it("live with provider unset uses OpenAI path (no silent Gemini switch)", async () => {
    snapEnv();
    process.env.MM_VOICE_RENDER = "live";
    delete process.env.MM_VOICE_PROVIDER;
    process.env.OPENAI_API_KEY = "test-key";
    const bytes = Buffer.from("fake-mp3");
    const result = await generateVoice(
      "Especially before bed.",
      defaultVoiceProviderConfig(),
      {
        synthesize: async () => ({ bytes, mimeType: "audio/mpeg" }),
        generateGemini: async () => {
          throw new Error("Gemini must not run when provider unset");
        },
      }
    );
    assert.equal(result.status, "generated");
    assert.equal(result.provider, "openai");
    assert.equal(result.mimeType, "audio/mpeg");
    assert.ok(result.bytes?.equals(bytes));
  });

  it("live + MM_VOICE_PROVIDER=gemini uses Gemini adapter", async () => {
    snapEnv();
    process.env.MM_VOICE_RENDER = "live";
    process.env.MM_VOICE_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "gemini-test-key";
    delete process.env.MM_VOICE_MODEL;
    const wav = Buffer.from("RIFF....WAVE");
    const result = await generateVoice(
      "Saved narration only.",
      defaultVoiceProviderConfig(),
      {
        synthesize: async () => {
          throw new Error("OpenAI must not run when provider=gemini");
        },
        generateGemini: async (script, geminiDeps = {}) => {
          assert.equal(script, "Saved narration only.");
          const cfg = geminiDeps.config;
          assert.ok(cfg);
          assert.equal(cfg.apiKey, "gemini-test-key");
          return {
            bytes: wav,
            mimeType: "audio/wav",
            durationSeconds: 2.5,
            model: cfg.model,
            provider: "gemini",
            scriptUsed: script.trim(),
          };
        },
      }
    );
    assert.equal(result.status, "generated");
    assert.equal(result.provider, "gemini");
    assert.equal(result.mimeType, "audio/wav");
    assert.equal(result.durationSeconds, 2.5);
    assert.equal(result.script_used, "Saved narration only.");
    assert.ok(result.bytes?.equals(wav));
  });

  it("defaultVoiceProviderConfig keeps openai when live and provider unset", () => {
    snapEnv();
    process.env.MM_VOICE_RENDER = "live";
    delete process.env.MM_VOICE_PROVIDER;
    const cfg = defaultVoiceProviderConfig();
    assert.equal(cfg.voice_provider, "openai");
  });

  it("defaultVoiceProviderConfig uses gemini only when explicitly set", () => {
    snapEnv();
    process.env.MM_VOICE_RENDER = "live";
    process.env.MM_VOICE_PROVIDER = "gemini";
    const cfg = defaultVoiceProviderConfig();
    assert.equal(cfg.voice_provider, "gemini");
    assert.ok(cfg.voice_model.length > 0);
    assert.equal(cfg.voice_id, "Puck");
  });
});
