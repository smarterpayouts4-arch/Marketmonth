import { generateGeminiVoice } from "./adapters/gemini-voice-generate";
import type { GeneratedVoice, VoiceProviderConfig } from "./types";

/** Provider-config default only — do not scatter this id outside voice config. */
const GEMINI_VOICE_MODEL_DEFAULT = "gemini-2.5-flash-preview-tts";
/** Upbeat Gemini prebuilt voice — override with MM_VOICE_ID. */
const GEMINI_VOICE_ID_DEFAULT = "Puck";
const OPENAI_VOICE_MODEL_DEFAULT = "tts-1";
const OPENAI_VOICE_ID_DEFAULT = "alloy";

export type GeneratedVoiceMedia = {
  status: "generated" | "stubbed" | "skipped";
  provider: string;
  model: string;
  asset_ref: string;
  script_used: string;
  /** Present for live TTS bytes before storage. */
  bytes?: Buffer;
  mimeType?: string;
  /** Measured when known; omit/undefined = Unverified. */
  durationSeconds?: number;
};

export type VoiceGenerateDeps = {
  /** Test injection — bypasses OpenAI. */
  synthesize?: (input: {
    model: string;
    voice: string;
    script: string;
    apiKey: string;
  }) => Promise<{ bytes: Buffer; mimeType: string; durationSeconds?: number }>;
  /** Test injection — bypasses Gemini adapter network. */
  generateGemini?: typeof generateGeminiVoice;
};

function resolveVoiceMode(): "live" | "stub" {
  const mode = process.env.MM_VOICE_RENDER?.trim().toLowerCase();
  if (mode === "live") return "live";
  return "stub";
}

function resolveLiveProvider(providerConfig: VoiceProviderConfig): string {
  return (
    providerConfig.voice_provider?.trim().toLowerCase() ||
    process.env.MM_VOICE_PROVIDER?.trim().toLowerCase() ||
    "openai"
  );
}

async function defaultOpenAiSpeech(input: {
  model: string;
  voice: string;
  script: string;
  apiKey: string;
}): Promise<{ bytes: Buffer; mimeType: string; durationSeconds?: number }> {
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      voice: input.voice,
      input: input.script,
      response_format: "mp3",
    }),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 240);
    throw new Error(`OpenAI TTS failed (${res.status}): ${detail}`);
  }
  const ab = await res.arrayBuffer();
  return { bytes: Buffer.from(ab), mimeType: "audio/mpeg" };
}

/**
 * Generate narration audio. Live when MM_VOICE_RENDER=live.
 * Gemini only when MM_VOICE_PROVIDER=gemini (no silent default switch).
 * Unset provider keeps the OpenAI live path.
 */
export async function generateVoice(
  script: string,
  providerConfig: VoiceProviderConfig,
  deps: VoiceGenerateDeps = {}
): Promise<GeneratedVoiceMedia> {
  if (!script.trim()) {
    return {
      status: "skipped",
      provider: providerConfig.voice_provider,
      model: providerConfig.voice_model,
      asset_ref: "",
      script_used: "",
    };
  }

  const mode = resolveVoiceMode();
  if (mode !== "live") {
    return {
      status: "stubbed",
      provider: providerConfig.voice_provider,
      model: providerConfig.voice_model,
      asset_ref: "stub://voice/narration",
      script_used: script,
    };
  }

  const provider = resolveLiveProvider(providerConfig);

  if (provider === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required when MM_VOICE_PROVIDER=gemini");
    }
    const model =
      providerConfig.voice_model.trim() ||
      process.env.MM_VOICE_MODEL?.trim() ||
      GEMINI_VOICE_MODEL_DEFAULT;
    const voiceName =
      providerConfig.voice_id?.trim() ||
      process.env.MM_VOICE_ID?.trim() ||
      GEMINI_VOICE_ID_DEFAULT;

    const gemini = deps.generateGemini ?? generateGeminiVoice;
    const audio = await gemini(script, {
      config: { apiKey, model, voiceName },
    });

    return {
      status: "generated",
      provider: "gemini",
      model: audio.model,
      asset_ref: `memory://voice/${audio.bytes.length}`,
      script_used: audio.scriptUsed,
      bytes: audio.bytes,
      mimeType: audio.mimeType,
      durationSeconds:
        audio.durationSeconds > 0 ? audio.durationSeconds : undefined,
    };
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required when MM_VOICE_RENDER=live");
  }

  const voice =
    providerConfig.voice_id?.trim() ||
    process.env.MM_VOICE_ID?.trim() ||
    OPENAI_VOICE_ID_DEFAULT;
  const model =
    providerConfig.voice_model.trim() ||
    process.env.MM_VOICE_MODEL?.trim() ||
    OPENAI_VOICE_MODEL_DEFAULT;

  const synth = deps.synthesize ?? defaultOpenAiSpeech;
  const speech = await synth({
    model,
    voice,
    script,
    apiKey,
  });

  return {
    status: "generated",
    provider: providerConfig.voice_provider || "openai",
    model,
    asset_ref: `memory://voice/${speech.bytes.length}`,
    script_used: script,
    bytes: speech.bytes,
    mimeType: speech.mimeType,
    ...(speech.durationSeconds != null && speech.durationSeconds > 0
      ? { durationSeconds: speech.durationSeconds }
      : {}),
  };
}

export function defaultVoiceProviderConfig(): VoiceProviderConfig {
  const live = resolveVoiceMode() === "live";
  const explicitProvider = process.env.MM_VOICE_PROVIDER?.trim().toLowerCase();

  if (live && explicitProvider === "gemini") {
    return {
      voice_provider: "gemini",
      voice_model:
        process.env.MM_VOICE_MODEL?.trim() || GEMINI_VOICE_MODEL_DEFAULT,
      voice_id: process.env.MM_VOICE_ID?.trim() || GEMINI_VOICE_ID_DEFAULT,
    };
  }

  return {
    voice_provider:
      explicitProvider || (live ? "openai" : "stub"),
    voice_model:
      process.env.MM_VOICE_MODEL?.trim() ||
      (live ? OPENAI_VOICE_MODEL_DEFAULT : "stub-voice-v1"),
    voice_id: process.env.MM_VOICE_ID?.trim() || undefined,
  };
}

/** Back-compat shape for callers that only need status/ref. */
export function toGeneratedVoiceSummary(
  media: GeneratedVoiceMedia
): GeneratedVoice {
  return {
    status: media.status,
    provider: media.provider,
    model: media.model,
    asset_ref: media.asset_ref,
    script_used: media.script_used,
  };
}
