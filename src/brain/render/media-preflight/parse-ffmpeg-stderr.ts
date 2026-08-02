import type { StreamInfo } from "./types";

export function parseStreamInfoFromStderr(stderr: string): StreamInfo {
  const durationMatch = stderr.match(
    /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/
  );
  let durationSeconds: number | null = null;
  if (durationMatch) {
    const h = Number(durationMatch[1]);
    const min = Number(durationMatch[2]);
    const sec = Number(durationMatch[3]);
    if ([h, min, sec].every((n) => Number.isFinite(n))) {
      const total = h * 3600 + min * 60 + sec;
      durationSeconds = total > 0 ? total : null;
    }
  }

  const streamPrefix = String.raw`Stream #\d+:\d+(?:\[[^\]]*\])?(?:\([^)]*\))?`;
  const videoMatch = stderr.match(
    new RegExp(`${streamPrefix}: Video:[\\s\\S]*?(\\d{2,5})x(\\d{2,5})`)
  );
  const width = videoMatch ? Number(videoMatch[1]) : null;
  const height = videoMatch ? Number(videoMatch[2]) : null;
  const hasVideo = new RegExp(`${streamPrefix}: Video:`).test(stderr);
  const hasAudio = new RegExp(`${streamPrefix}: Audio:`).test(stderr);

  return {
    durationSeconds,
    width: Number.isFinite(width) ? width : null,
    height: Number.isFinite(height) ? height : null,
    hasVideo,
    hasAudio,
  };
}
