import { resolveFfmpegPath } from "./adapters/resolve-ffmpeg-path";
import { decodeCheckLocal } from "./media-preflight/decode-check";
import { probeLocalFile } from "./media-preflight/probe-local-file";
import {
  cleanupTempDir,
  resolveLocalSource,
} from "./media-preflight/resolve-local-source";
import type {
  MediaPreflightInput,
  MediaPreflightResult,
} from "./media-preflight/types";

export type { MediaPreflightInput, MediaPreflightResult } from "./media-preflight/types";

/**
 * Technical validation before marking a scene/package MP4 Ready.
 * Prefers structured ffprobe JSON; falls back to ffmpeg stderr parsing.
 * Optionally runs a full decode pass.
 */
export async function runMediaPreflight(
  input: MediaPreflightInput
): Promise<MediaPreflightResult> {
  const ffmpeg = resolveFfmpegPath();
  if (!ffmpeg.ok) {
    return {
      ok: false,
      code: "media_preflight.ffmpeg_missing",
      error: ffmpeg.error,
    };
  }

  let tempDir: string | null = null;

  try {
    const resolved = await resolveLocalSource(
      input.source,
      input.checkUrlReachable
    );
    if (!resolved.ok) {
      return resolved;
    }

    const { localPath, tempDir: resolvedTempDir } = resolved;
    tempDir = resolvedTempDir;

    const { info, probeSource } = await probeLocalFile(ffmpeg.path, localPath);

    if (!info.hasVideo) {
      return {
        ok: false,
        code: "media_preflight.no_video",
        error: "No video stream found",
      };
    }
    if (input.expectAudio !== false && !info.hasAudio) {
      return {
        ok: false,
        code: "media_preflight.no_audio",
        error: "No audio stream found",
      };
    }
    if (info.durationSeconds == null || !(info.durationSeconds > 0)) {
      return {
        ok: false,
        code: "media_preflight.invalid_duration",
        error: "Duration must be greater than zero",
      };
    }
    if (info.width == null || info.height == null) {
      return {
        ok: false,
        code: "media_preflight.invalid_dimensions",
        error: "Could not read video dimensions",
      };
    }
    if (input.expectWidth != null && info.width !== input.expectWidth) {
      return {
        ok: false,
        code: "media_preflight.dimension_mismatch",
        error: `Expected width ${input.expectWidth}, got ${info.width}`,
      };
    }
    if (input.expectHeight != null && info.height !== input.expectHeight) {
      return {
        ok: false,
        code: "media_preflight.dimension_mismatch",
        error: `Expected height ${input.expectHeight}, got ${info.height}`,
      };
    }

    if (input.decodeCheck !== false) {
      const decoded = await decodeCheckLocal(ffmpeg.path, localPath);
      if (!decoded.ok) {
        return {
          ok: false,
          code: "media_preflight.decode_failed",
          error: decoded.error,
        };
      }
    }

    return {
      ok: true,
      durationSeconds: info.durationSeconds,
      width: info.width,
      height: info.height,
      hasVideo: info.hasVideo,
      hasAudio: info.hasAudio,
      probeSource,
    };
  } catch (err) {
    return {
      ok: false,
      code: "media_preflight.probe_failed",
      error:
        err instanceof Error
          ? err.message.slice(0, 400)
          : "Media preflight failed",
    };
  } finally {
    cleanupTempDir(tempDir);
  }
}
