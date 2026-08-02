import { spawn } from "node:child_process";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { resolveFfmpegPath } from "./resolve-ffmpeg-path";

const FFMPEG_TIMEOUT_MS = 240_000;
const DOWNLOAD_TIMEOUT_MS = 60_000;

async function downloadToFile(url: string, destPath: string): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Download failed (${res.status}) for ${url}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0) {
      throw new Error(`Downloaded empty file from ${url}`);
    }
    writeFileSync(destPath, buf);
  } finally {
    clearTimeout(timer);
  }
}

function runFfmpeg(
  ffmpegPath: string,
  args: string[],
  cwd: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, {
      cwd,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`FFmpeg concat timed out after ${FFMPEG_TIMEOUT_MS}ms`));
    }, FFMPEG_TIMEOUT_MS);
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `FFmpeg concat exited with code ${code ?? "unknown"}: ${stderr.slice(-800)}`
        )
      );
    });
  });
}

export type ConcatSceneClip = {
  sceneId: string;
  url: string;
};

export type FfmpegConcatResult = {
  bytes: Buffer;
  mimeType: "video/mp4";
  sceneIds: string[];
};

/**
 * Concatenate ordered scene MP4s with the FFmpeg concat demuxer.
 *
 * Always re-encodes (never stream-copy) into a canonical Short delivery format:
 * 1080×1920, H.264, yuv420p, 30 fps, AAC stereo @ 44.1 kHz.
 * This tolerates mixed provider frame rates / audio layouts.
 */
export async function ffmpegConcatSceneClips(
  clips: ConcatSceneClip[]
): Promise<FfmpegConcatResult> {
  if (clips.length === 0) {
    throw new Error("No scene clips to concatenate");
  }

  const ffmpeg = resolveFfmpegPath();
  if (!ffmpeg.ok) {
    throw new Error(ffmpeg.error);
  }

  const tempDir = mkdtempSync(path.join(tmpdir(), "mm-concat-"));
  try {
    const listLines: string[] = [];
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i]!;
      const localName = `scene_${String(i).padStart(3, "0")}.mp4`;
      const localPath = path.join(tempDir, localName);
      await downloadToFile(clip.url, localPath);
      // concat demuxer wants forward slashes / escaped paths
      const escaped = localPath.replace(/\\/g, "/").replace(/'/g, "'\\''");
      listLines.push(`file '${escaped}'`);
    }

    const listPath = path.join(tempDir, "list.txt");
    writeFileSync(listPath, listLines.join("\n"), "utf8");
    const outPath = path.join(tempDir, "final-short.mp4");

    await runFfmpeg(
      ffmpeg.path,
      [
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        listPath,
        "-vf",
        "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-r",
        "30",
        "-c:a",
        "aac",
        "-ar",
        "44100",
        "-ac",
        "2",
        "-movflags",
        "+faststart",
        outPath,
      ],
      tempDir
    );

    const bytes = readFileSync(outPath);
    if (bytes.length === 0) {
      throw new Error("Concat produced empty output");
    }

    return {
      bytes,
      mimeType: "video/mp4",
      sceneIds: clips.map((c) => c.sceneId),
    };
  } finally {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      /* best-effort */
    }
  }
}
