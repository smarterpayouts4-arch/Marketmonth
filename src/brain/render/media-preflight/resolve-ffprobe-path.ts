import { existsSync } from "node:fs";

export function resolveFfprobePath(ffmpegPath: string): string | null {
  const fromEnv = process.env.MM_FFPROBE_PATH?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  const sibling = ffmpegPath.replace(/ffmpeg(\.exe)?$/i, "ffprobe$1");
  if (sibling !== ffmpegPath && existsSync(sibling)) return sibling;
  return null;
}
