export type MediaPreflightInput = {
  /** Local file path or remote URL. */
  source: string | { bytes: Buffer; hintName?: string };
  expectAudio?: boolean;
  expectWidth?: number;
  expectHeight?: number;
  /** When source is a URL, HEAD-check reachability first. */
  checkUrlReachable?: boolean;
  /** Full decode pass (`ffmpeg -f null -`). Default true. */
  decodeCheck?: boolean;
};

export type MediaPreflightResult =
  | {
      ok: true;
      durationSeconds: number;
      width: number;
      height: number;
      hasVideo: boolean;
      hasAudio: boolean;
      probeSource: "ffprobe-json" | "ffmpeg-stderr";
    }
  | { ok: false; error: string; code: string };

export type StreamInfo = {
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  hasVideo: boolean;
  hasAudio: boolean;
};
