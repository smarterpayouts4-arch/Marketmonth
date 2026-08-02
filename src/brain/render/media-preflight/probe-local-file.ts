import { parseFfprobeJson } from "./parse-ffprobe-json";
import { parseStreamInfoFromStderr } from "./parse-ffmpeg-stderr";
import { resolveFfprobePath } from "./resolve-ffprobe-path";
import { runProcess } from "./run-process";
import type { StreamInfo } from "./types";

export async function probeLocalFile(
  ffmpegPath: string,
  filePath: string
): Promise<{ info: StreamInfo; probeSource: "ffprobe-json" | "ffmpeg-stderr" }> {
  const ffprobe = resolveFfprobePath(ffmpegPath);
  if (ffprobe) {
    const probed = await runProcess(
      ffprobe,
      [
        "-v",
        "quiet",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        filePath,
      ],
      20_000
    );
    const parsed = parseFfprobeJson(probed.stdout);
    if (parsed) {
      return { info: parsed, probeSource: "ffprobe-json" };
    }
  }

  const fallback = await runProcess(
    ffmpegPath,
    ["-hide_banner", "-i", filePath],
    20_000
  );
  return {
    info: parseStreamInfoFromStderr(fallback.stderr),
    probeSource: "ffmpeg-stderr",
  };
}
