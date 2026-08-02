import { runProcess } from "./run-process";

export async function decodeCheckLocal(
  ffmpegPath: string,
  filePath: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const result = await runProcess(
      ffmpegPath,
      ["-v", "error", "-i", filePath, "-f", "null", "-"],
      60_000
    );
    if (result.stderr.trim()) {
      return {
        ok: false,
        error: `Decode errors: ${result.stderr.trim().slice(0, 300)}`,
      };
    }
    // ffmpeg may exit non-zero even with empty stderr for some edge cases;
    // treat non-zero + empty stderr as ok only when code is 0.
    if (result.code !== 0 && result.code != null) {
      return {
        ok: false,
        error: `Decode check exited with code ${result.code}`,
      };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message.slice(0, 300)
          : "Decode check failed",
    };
  }
}
