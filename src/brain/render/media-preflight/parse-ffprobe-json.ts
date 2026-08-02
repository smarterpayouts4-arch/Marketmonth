import type { StreamInfo } from "./types";

export function parseFfprobeJson(raw: string): StreamInfo | null {
  try {
    const data = JSON.parse(raw) as {
      format?: { duration?: string };
      streams?: Array<{
        codec_type?: string;
        width?: number;
        height?: number;
        duration?: string;
      }>;
    };
    const streams = data.streams ?? [];
    const video = streams.find((s) => s.codec_type === "video");
    const audio = streams.find((s) => s.codec_type === "audio");
    const durationRaw =
      data.format?.duration ?? video?.duration ?? audio?.duration;
    const durationSeconds =
      durationRaw != null && Number.isFinite(Number(durationRaw))
        ? Number(durationRaw)
        : null;
    return {
      durationSeconds:
        durationSeconds != null && durationSeconds > 0
          ? durationSeconds
          : null,
      width: video?.width ?? null,
      height: video?.height ?? null,
      hasVideo: Boolean(video),
      hasAudio: Boolean(audio),
    };
  } catch {
    return null;
  }
}
