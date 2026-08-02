import { existsSync } from "node:fs";

export type ResolveFfmpegPathResult =
  | { ok: true; path: string; source: "env" | "ffmpeg-static" }
  | { ok: false; error: string };

/**
 * Deterministic FFmpeg executable resolution for the local compositor spike.
 * Order: MM_FFMPEG_PATH → ffmpeg-static package binary.
 */
export function resolveFfmpegPath(): ResolveFfmpegPathResult {
  const fromEnv = process.env.MM_FFMPEG_PATH?.trim();
  if (fromEnv) {
    if (!existsSync(fromEnv)) {
      return {
        ok: false,
        error: `MM_FFMPEG_PATH does not exist: ${fromEnv}`,
      };
    }
    return { ok: true, path: fromEnv, source: "env" };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ffmpegStatic = require("ffmpeg-static") as string | null;
    if (typeof ffmpegStatic === "string" && ffmpegStatic.trim()) {
      if (!existsSync(ffmpegStatic)) {
        return {
          ok: false,
          error:
            "ffmpeg-static resolved a path that does not exist on disk — reinstall ffmpeg-static",
        };
      }
      return { ok: true, path: ffmpegStatic, source: "ffmpeg-static" };
    }
  } catch {
    /* package missing */
  }

  return {
    ok: false,
    error:
      "FFmpeg executable not found. Set MM_FFMPEG_PATH or install the ffmpeg-static dependency.",
  };
}
