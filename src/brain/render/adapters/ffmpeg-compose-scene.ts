import { spawn } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type {
  ComposeSceneVideoRequest,
  ComposeSceneVideoResult,
} from "../compose-scene-video.types";

import { buildTitleAssOverlay } from "./build-title-ass";
import { stageComposeFont } from "./resolve-compose-font";
import { resolveFfmpegPath } from "./resolve-ffmpeg-path";

const DOWNLOAD_TIMEOUT_MS = 60_000;
const FFMPEG_TIMEOUT_MS = 180_000;

async function downloadToFile(
  url: string,
  destPath: string
): Promise<{ bytes: number; mimeType: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Download failed (${res.status})`);
    }
    const ab = await res.arrayBuffer();
    const buf = Buffer.from(ab);
    if (!buf.length) {
      throw new Error("Download returned empty body");
    }
    writeFileSync(destPath, buf);
    const mime =
      res.headers.get("content-type")?.split(";")[0]?.trim() ||
      "application/octet-stream";
    return { bytes: buf.length, mimeType: mime };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Media download timed out");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function runFfmpeg(
  ffmpegPath: string,
  args: string[],
  cwd: string
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, {
      cwd,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`FFmpeg timed out after ${FFMPEG_TIMEOUT_MS}ms`));
    }, FFMPEG_TIMEOUT_MS);
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
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
        resolve({ stdout, stderr });
        return;
      }
      const tail = stderr.slice(-1200);
      reject(
        new Error(
          `FFmpeg exited with code ${code ?? "unknown"}${tail ? `: ${tail}` : ""}`
        )
      );
    });
  });
}

/** Parse `Duration: HH:MM:SS.cs` from ffmpeg -i stderr. */
export function parseFfmpegDurationSeconds(stderr: string): number | null {
  const m = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  const sec = Number(m[3]);
  if (![h, min, sec].every((n) => Number.isFinite(n))) return null;
  const total = h * 3600 + min * 60 + sec;
  return total > 0 ? total : null;
}

async function probeDurationSeconds(
  ffmpegPath: string,
  mediaPath: string,
  cwd: string
): Promise<number | null> {
  return new Promise((resolveProbe) => {
    const child = spawn(ffmpegPath, ["-i", mediaPath], {
      cwd,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolveProbe(parseFfmpegDurationSeconds(stderr));
    }, 15_000);
    child.stderr.on("data", (c: Buffer) => {
      stderr += c.toString("utf8");
    });
    child.on("close", () => {
      clearTimeout(timer);
      resolveProbe(parseFfmpegDurationSeconds(stderr));
    });
    child.on("error", () => {
      clearTimeout(timer);
      resolveProbe(null);
    });
  });
}

/**
 * Compose still or motion visual + ASS title + voice into H.264/AAC 9:16 MP4.
 */
export async function ffmpegComposeSceneVideo(
  request: ComposeSceneVideoRequest
): Promise<Extract<ComposeSceneVideoResult, { status: "generated" }>> {
  const resolved = resolveFfmpegPath();
  if (!resolved.ok) {
    throw new Error(resolved.error);
  }

  const width = request.output.width;
  const height = request.output.height;
  const fps = request.output.fps;
  const duration = request.durationSeconds;
  if (!(duration > 0)) {
    throw new Error("durationSeconds must be positive");
  }

  const workRoot = mkdtempSync(path.join(tmpdir(), "mm-compose-"));
  const visualName =
    request.visual.kind === "motion" ? "motion.bin" : "still.bin";
  const audioName = "voice.bin";
  const assName = "title.ass";
  const outName = "out.mp4";
  const visualPath = path.join(workRoot, visualName);
  const audioPath = path.join(workRoot, audioName);
  const assPath = path.join(workRoot, assName);
  const outPath = path.join(workRoot, outName);

  try {
    mkdirSync(workRoot, { recursive: true });
    await downloadToFile(request.visual.url, visualPath);
    await downloadToFile(request.audioUrl, audioPath);

    const stagedFont = stageComposeFont(workRoot);
    const ass = buildTitleAssOverlay({
      overlay: request.titleOverlay,
      durationSeconds: duration,
      width,
      height,
      fontFamily: stagedFont.family,
    });
    writeFileSync(assPath, ass, "utf8");

    const subtitlesFilter = stagedFont.fontsDirRelative
      ? `subtitles=${assName}:fontsdir=${stagedFont.fontsDirRelative}`
      : `subtitles=${assName}`;

    let args: string[];

    if (request.visual.kind === "still") {
      const vf = [
        `scale=${width}:${height}:force_original_aspect_ratio=increase`,
        `crop=${width}:${height}`,
        "setsar=1",
        subtitlesFilter,
      ].join(",");
      args = [
        "-nostdin",
        "-y",
        "-framerate",
        String(fps),
        "-loop",
        "1",
        "-t",
        String(duration),
        "-i",
        visualName,
        "-i",
        audioName,
        "-vf",
        vf,
        "-c:v",
        "libx264",
        "-tune",
        "stillimage",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-t",
        String(duration),
        "-shortest",
        "-movflags",
        "+faststart",
        outName,
      ];
    } else {
      const motionDur =
        (await probeDurationSeconds(resolved.path, visualName, workRoot)) ?? 0;
      const pad = Math.max(0, duration - motionDur);
      const padFilter =
        pad > 0.01 ? `tpad=stop_mode=clone:stop_duration=${pad.toFixed(3)}` : null;
      const fc = [
        `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase`,
        `crop=${width}:${height}`,
        "setsar=1",
        padFilter,
        `${subtitlesFilter}[v]`,
      ]
        .filter(Boolean)
        .join(",");
      args = [
        "-nostdin",
        "-y",
        "-i",
        visualName,
        "-i",
        audioName,
        "-filter_complex",
        fc,
        "-map",
        "[v]",
        "-map",
        "1:a:0",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-t",
        String(duration),
        "-movflags",
        "+faststart",
        outName,
      ];
    }

    await runFfmpeg(resolved.path, args, workRoot);

    const bytes = readFileSync(outPath);
    if (!bytes.length) {
      throw new Error("FFmpeg produced an empty MP4");
    }

    let durationSeconds = duration;
    let durationVerified = false;
    const measured = await probeDurationSeconds(
      resolved.path,
      outName,
      workRoot
    );
    if (measured != null && measured > 0) {
      durationSeconds = measured;
      durationVerified = true;
    }

    return {
      status: "generated",
      provider: "local",
      compositor: "ffmpeg",
      bytes,
      mimeType: "video/mp4",
      width,
      height,
      durationSeconds,
      durationVerified,
    };
  } finally {
    try {
      rmSync(workRoot, { recursive: true, force: true });
    } catch {
      /* best-effort cleanup */
    }
  }
}
