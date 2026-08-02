import { ffmpegComposeSceneVideo } from "./adapters/ffmpeg-compose-scene";
import { resolveFfmpegPath } from "./adapters/resolve-ffmpeg-path";
import type {
  ComposeSceneVideoRequest,
  ComposeSceneVideoResult,
} from "./compose-scene-video.types";

export type {
  ComposeSceneTitleOverlay,
  ComposeSceneVideoOutputSpec,
  ComposeSceneVideoRequest,
  ComposeSceneVideoResult,
  ComposeSceneVisual,
} from "./compose-scene-video.types";

export type ComposeSceneVideoDeps = {
  /** Test injection — bypasses FFmpeg. */
  composeWithFfmpeg?: (
    request: ComposeSceneVideoRequest
  ) => Promise<Extract<ComposeSceneVideoResult, { status: "generated" }>>;
};

function resolveComposeMode(): "live" | "stub" {
  const mode = process.env.MM_SCENE_COMPOSE_RENDER?.trim().toLowerCase();
  if (mode === "live") return "live";
  return "stub";
}

function resolveCompositor(): string {
  return (
    process.env.MM_SCENE_COMPOSITOR?.trim().toLowerCase() || "ffmpeg"
  );
}

/**
 * Provider-neutral one-scene composition entry.
 * Live only when MM_SCENE_COMPOSE_RENDER=live and MM_SCENE_COMPOSITOR=ffmpeg.
 */
export async function composeSceneVideo(
  request: ComposeSceneVideoRequest,
  deps: ComposeSceneVideoDeps = {}
): Promise<ComposeSceneVideoResult> {
  const width = request.output.width || 1080;
  const height = request.output.height || 1920;
  const durationSeconds = request.durationSeconds;

  const mode = resolveComposeMode();
  if (mode !== "live") {
    return {
      status: "stubbed",
      provider: "stub",
      compositor: resolveCompositor() || "stub",
      asset_ref: "stub://compose/scene-mp4",
      width,
      height,
      durationSeconds,
    };
  }

  const compositor = resolveCompositor();
  if (compositor !== "ffmpeg") {
    throw new Error(
      `Unsupported MM_SCENE_COMPOSITOR="${compositor}". Supported: ffmpeg`
    );
  }

  const ffmpeg = resolveFfmpegPath();
  if (!ffmpeg.ok) {
    throw new Error(ffmpeg.error);
  }

  const run = deps.composeWithFfmpeg ?? ffmpegComposeSceneVideo;
  return run({
    ...request,
    output: {
      ...request.output,
      width,
      height,
      fps: request.output.fps || 30,
      format: "mp4",
    },
  });
}

export function defaultComposeOutputSpec(): {
  width: number;
  height: number;
  fps: number;
  format: "mp4";
} {
  return { width: 1080, height: 1920, fps: 30, format: "mp4" };
}
