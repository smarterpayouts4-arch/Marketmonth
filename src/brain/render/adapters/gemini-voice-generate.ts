import { GoogleGenAI } from "@google/genai";

import {
  isRawPcmMime,
  pcmDurationSeconds,
  pcmToWav,
} from "./pcm-to-wav";

export type GeneratedVoiceAudio = {
  bytes: Buffer;
  mimeType: string;
  durationSeconds: number;
  model: string;
  provider: "gemini";
  scriptUsed: string;
};

export type GeminiVoiceConfig = {
  apiKey: string;
  model: string;
  voiceName: string;
};

export type GeminiVoiceGenerateDeps = {
  config?: GeminiVoiceConfig;
  /** Test injection — bypasses GoogleGenAI. */
  generateContent?: (input: {
    model: string;
    prompt: string;
    voiceName: string;
  }) => Promise<{ inlineData?: { data?: string; mimeType?: string } }>;
};

/** Build Gemini TTS prompt: style direction + delimited script (tags not spoken). */
export function buildGeminiVoicePrompt(narration: string): string {
  return [
    "Speak with high energy: energetic, exciting, upbeat, and punchy — like a viral Shorts hook.",
    "Use brisk pacing (noticeably faster than a calm read). Sound lively and engaging, not sleepy or soft.",
    "Read only the text between <script> tags. Do not speak the tags or these instructions.",
    "",
    "<script>",
    narration,
    "</script>",
  ].join("\n");
}

async function defaultGenerateContent(input: {
  model: string;
  prompt: string;
  voiceName: string;
  apiKey: string;
}): Promise<{ inlineData?: { data?: string; mimeType?: string } }> {
  const ai = new GoogleGenAI({ apiKey: input.apiKey });
  const response = await ai.models.generateContent({
    model: input.model,
    contents: input.prompt,
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: input.voiceName,
          },
        },
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
 * Generate one scene voiceover via Gemini TTS. Returns WAV bytes + measured duration.
 * Does not upload or persist.
 */
export async function generateGeminiVoice(
  narration: string,
  deps: GeminiVoiceGenerateDeps = {}
): Promise<GeneratedVoiceAudio> {
  const script = narration.trim();
  if (!script) {
    throw new Error("Gemini voice requires non-empty narration");
  }

  const config = deps.config;
  if (!config?.apiKey?.trim()) {
    throw new Error("GEMINI_API_KEY is required when MM_VOICE_PROVIDER=gemini");
  }
  if (!config.model.trim()) {
    throw new Error("MM_VOICE_MODEL is required when MM_VOICE_PROVIDER=gemini");
  }
  const voiceName = config.voiceName.trim() || "Puck";
  const prompt = buildGeminiVoicePrompt(script);

  let raw: { inlineData?: { data?: string; mimeType?: string } };
  try {
    if (deps.generateContent) {
      raw = await deps.generateContent({
        model: config.model,
        prompt,
        voiceName,
      });
    } else {
      raw = await defaultGenerateContent({
        model: config.model,
        prompt,
        voiceName,
        apiKey: config.apiKey,
      });
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message.slice(0, 400) : "Gemini TTS failed";
    throw new Error(`Gemini TTS failed: ${message}`);
  }

  const b64 = raw.inlineData?.data?.trim();
  if (!b64) {
    throw new Error("Gemini TTS returned no audio data");
  }

  let decoded: Buffer;
  try {
    decoded = Buffer.from(b64, "base64");
  } catch {
    throw new Error("Gemini TTS returned invalid audio encoding");
  }
  if (!decoded.length) {
    throw new Error("Gemini TTS returned empty audio bytes");
  }

  const responseMime = raw.inlineData?.mimeType?.trim();
  if (isRawPcmMime(responseMime)) {
    const durationSeconds = pcmDurationSeconds(decoded.length);
    if (!(durationSeconds > 0)) {
      throw new Error("Gemini TTS PCM produced non-positive duration");
    }
    return {
      bytes: pcmToWav(decoded),
      mimeType: "audio/wav",
      durationSeconds,
      model: config.model,
      provider: "gemini",
      scriptUsed: script,
    };
  }

  // Unexpected container — pass through with unknown duration (caller may omit).
  return {
    bytes: decoded,
    mimeType: responseMime || "application/octet-stream",
    durationSeconds: 0,
    model: config.model,
    provider: "gemini",
    scriptUsed: script,
  };
}
