import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildGeminiVoicePrompt,
  generateGeminiVoice,
} from "./gemini-voice-generate";
import { GEMINI_TTS_PCM_SAMPLE_RATE } from "./pcm-to-wav";

describe("generateGeminiVoice", () => {
  it("builds delimited prompt so delivery instructions wrap <script>", () => {
    const prompt = buildGeminiVoicePrompt("Why is magnesium attracting attention?");
    assert.match(prompt, /high energy|energetic|exciting|brisk pacing/i);
    assert.match(prompt, /Read only the text between <script> tags/i);
    assert.match(
      prompt,
      /<script>\nWhy is magnesium attracting attention\?\n<\/script>/
    );
  });

  it("wraps injected PCM as WAV with measured duration", async () => {
    const pcm = Buffer.alloc(GEMINI_TTS_PCM_SAMPLE_RATE * 2, 0); // 1s
    const audio = await generateGeminiVoice("Exact saved narration.", {
      config: {
        apiKey: "test-key",
        model: "test-tts-model",
        voiceName: "Puck",
      },
      generateContent: async ({ prompt }) => {
        assert.match(prompt, /<script>\nExact saved narration\.\n<\/script>/);
        assert.doesNotMatch(prompt, /visualPrompt|onScreenText/i);
        return {
          inlineData: {
            data: pcm.toString("base64"),
            mimeType: "audio/L16",
          },
        };
      },
    });

    assert.equal(audio.provider, "gemini");
    assert.equal(audio.model, "test-tts-model");
    assert.equal(audio.scriptUsed, "Exact saved narration.");
    assert.equal(audio.mimeType, "audio/wav");
    assert.equal(audio.durationSeconds, 1);
    assert.equal(audio.bytes.toString("ascii", 0, 4), "RIFF");
  });
});
