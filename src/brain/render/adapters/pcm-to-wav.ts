/** Gemini Developer API TTS PCM contract (documented). */
export const GEMINI_TTS_PCM_SAMPLE_RATE = 24_000 as const;
export const GEMINI_TTS_PCM_CHANNELS = 1 as const;
export const GEMINI_TTS_PCM_BIT_DEPTH = 16 as const;

export type PcmWavOptions = {
  sampleRate?: number;
  channels?: number;
  bitDepth?: number;
};

/** Measured duration from raw PCM byte length (no word-count estimate). */
export function pcmDurationSeconds(
  pcmByteLength: number,
  options: PcmWavOptions = {}
): number {
  const sampleRate = options.sampleRate ?? GEMINI_TTS_PCM_SAMPLE_RATE;
  const channels = options.channels ?? GEMINI_TTS_PCM_CHANNELS;
  const bitDepth = options.bitDepth ?? GEMINI_TTS_PCM_BIT_DEPTH;
  const bytesPerSample = bitDepth / 8;
  if (pcmByteLength <= 0 || sampleRate <= 0 || channels <= 0 || bytesPerSample <= 0) {
    return 0;
  }
  return pcmByteLength / (sampleRate * channels * bytesPerSample);
}

/** Wrap little-endian PCM in a standard RIFF/WAVE container. */
export function pcmToWav(pcm: Buffer, options: PcmWavOptions = {}): Buffer {
  const sampleRate = options.sampleRate ?? GEMINI_TTS_PCM_SAMPLE_RATE;
  const channels = options.channels ?? GEMINI_TTS_PCM_CHANNELS;
  const bitDepth = options.bitDepth ?? GEMINI_TTS_PCM_BIT_DEPTH;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = channels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcm.length;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // PCM fmt chunk size
  header.writeUInt16LE(1, 20); // audio format = PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcm]);
}

export function isRawPcmMime(mimeType: string | undefined): boolean {
  if (!mimeType?.trim()) return true;
  const m = mimeType.toLowerCase();
  if (m.includes("wav") || m.includes("mpeg") || m.includes("mp3") || m.includes("ogg")) {
    return false;
  }
  return (
    m.includes("pcm") ||
    m.includes("l16") ||
    m.includes("audio/l16") ||
    m.includes("linear") ||
    m === "audio/raw"
  );
}
