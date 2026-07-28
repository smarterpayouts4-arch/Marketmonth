import type { GeneratedVoice, VoiceProviderConfig } from "./types";

export async function generateVoice(
  script: string,
  providerConfig: VoiceProviderConfig
): Promise<GeneratedVoice> {
  if (!script.trim()) {
    return {
      status: "skipped",
      provider: providerConfig.voice_provider,
      model: providerConfig.voice_model,
      asset_ref: "",
      script_used: "",
    };
  }

  return {
    status: "stubbed",
    provider: providerConfig.voice_provider,
    model: providerConfig.voice_model,
    asset_ref: "stub://voice/narration",
    script_used: script,
  };
}

export function defaultVoiceProviderConfig(): VoiceProviderConfig {
  return {
    voice_provider: process.env.MM_VOICE_PROVIDER || "stub",
    voice_model: process.env.MM_VOICE_MODEL || "stub-voice-v1",
  };
}
