import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  GEMINI_TTS_PCM_SAMPLE_RATE,
  isRawPcmMime,
  pcmDurationSeconds,
  pcmToWav,
} from "./pcm-to-wav";

describe("pcmToWav / pcmDurationSeconds", () => {
  it("measures duration from PCM byte count at 24kHz mono 16-bit", () => {
    // 1.0 second = 24000 * 1 * 2 bytes
    const pcm = Buffer.alloc(GEMINI_TTS_PCM_SAMPLE_RATE * 2, 0);
    assert.equal(pcmDurationSeconds(pcm.length), 1);
  });

  it("wraps PCM in a RIFF/WAVE header", () => {
    const pcm = Buffer.alloc(100, 1);
    const wav = pcmToWav(pcm);
    assert.equal(wav.length, 144);
    assert.equal(wav.toString("ascii", 0, 4), "RIFF");
    assert.equal(wav.toString("ascii", 8, 12), "WAVE");
    assert.equal(wav.readUInt16LE(20), 1); // PCM
    assert.equal(wav.readUInt16LE(22), 1); // mono
    assert.equal(wav.readUInt32LE(24), 24_000);
    assert.equal(wav.readUInt16LE(34), 16);
    assert.ok(wav.subarray(44).equals(pcm));
  });

  it("treats empty/L16/pcm mime as raw PCM", () => {
    assert.equal(isRawPcmMime(undefined), true);
    assert.equal(isRawPcmMime("audio/L16"), true);
    assert.equal(isRawPcmMime("audio/pcm"), true);
    assert.equal(isRawPcmMime("audio/wav"), false);
    assert.equal(isRawPcmMime("audio/mpeg"), false);
  });
});
