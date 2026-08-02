import {
  defaultVideoProviderConfig,
  generateVideo,
  uploadSceneVideoToImageKit,
} from "@/brain/render";

import { priorSucceededAssetFields } from "../in-flight-guard";
import {
  renderStepLockKey,
  withRenderStepLock,
} from "../render-step-lock";
import type { SceneVideoState } from "../scene-video-state";

import { defaultFetchStill } from "./fetch-still";
import { persistSceneVideo } from "./persist-scene-video";
import { prepareSceneVideo } from "./prepare-scene-video";
import type {
  RenderSavedSceneVideoDeps,
  RenderSavedSceneVideoInput,
  RenderSavedSceneVideoResult,
} from "./types";

/**
 * Generate image-to-video for one saved Short scene from durable still + motionPrompt.
 * Live when MM_VIDEO_RENDER=live and MM_VIDEO_PROVIDER=veo; otherwise persists stubbed state.
 */
export async function renderYouTubeShortSavedSceneVideo(
  input: RenderSavedSceneVideoInput,
  deps: RenderSavedSceneVideoDeps = {}
): Promise<RenderSavedSceneVideoResult> {
  return withRenderStepLock(
    renderStepLockKey("video", input.atomId, input.sceneId),
    () => renderYouTubeShortSavedSceneVideoLocked(input, deps)
  );
}

async function renderYouTubeShortSavedSceneVideoLocked(
  input: RenderSavedSceneVideoInput,
  deps: RenderSavedSceneVideoDeps
): Promise<RenderSavedSceneVideoResult> {
  const preparedOutcome = await prepareSceneVideo(input);
  if (!preparedOutcome.ok) return preparedOutcome.result;

  let { bundle, shortPkg } = preparedOutcome.prepared;
  const {
    atomId,
    sceneId,
    veoPrompt,
    sourceImageUrl,
    sourceImageRef,
    attempt,
    priorVideo,
  } = preparedOutcome.prepared;

  const requestedAt = new Date().toISOString();
  const running: SceneVideoState = {
    status: "running",
    requestedAt,
    startedAt: requestedAt,
    attempt,
    updatedAt: requestedAt,
    promptUsed: veoPrompt,
    sourceImageUrl,
    sourceImageRef,
  };
  ({ bundle, shortPkg } = await persistSceneVideo(
    bundle,
    shortPkg,
    sceneId,
    running
  ));

  const runGenerate = deps.generateVideo ?? generateVideo;
  const runUpload = deps.uploadSceneVideo ?? uploadSceneVideoToImageKit;
  const runFetch = deps.fetchStill ?? defaultFetchStill;

  try {
    const still = await runFetch(sourceImageUrl);
    const media = await runGenerate(
      {
        prompt: veoPrompt,
        imageBytes: still.bytes,
        imageMimeType: still.mimeType,
      },
      defaultVideoProviderConfig()
    );
    const completedAt = new Date().toISOString();

    if (media.status === "stubbed" || media.status === "skipped") {
      const video: SceneVideoState = {
        status: media.status === "stubbed" ? "stubbed" : "idle",
        provider: media.provider,
        model: media.model,
        assetRef: media.asset_ref || undefined,
        promptUsed: media.prompt_used,
        resolution: media.resolution,
        sourceImageUrl,
        sourceImageRef,
        attempt,
        requestedAt,
        startedAt: requestedAt,
        completedAt,
        updatedAt: completedAt,
      };
      ({ bundle } = await persistSceneVideo(bundle, shortPkg, sceneId, video));
      return {
        ok: true,
        status: 200,
        atomId,
        sceneId,
        video,
        bundle,
        message:
          media.status === "stubbed"
            ? "Video stubbed (set MM_VIDEO_RENDER=live and MM_VIDEO_PROVIDER=veo)"
            : "Video skipped — empty motion prompt",
      };
    }

    if (!media.bytes?.length) {
      throw new Error("Video provider returned no video bytes");
    }

    const storedVideo = await runUpload({
      atomId,
      sceneId,
      bytes: media.bytes,
      mimeType: media.mimeType || "video/mp4",
    });

    const video: SceneVideoState = {
      status: "succeeded",
      provider: media.provider,
      model: media.model,
      assetRef: storedVideo.assetRef,
      assetUrl: storedVideo.assetUrl,
      mimeType: storedVideo.mimeType,
      ...(media.durationSeconds != null && media.durationSeconds > 0
        ? { durationSeconds: media.durationSeconds }
        : {}),
      resolution: media.resolution,
      promptUsed: media.prompt_used,
      sourceImageUrl,
      sourceImageRef,
      storageProvider: storedVideo.storageProvider,
      storageFileId: storedVideo.storageFileId,
      attempt,
      requestedAt,
      startedAt: requestedAt,
      completedAt,
      updatedAt: completedAt,
    };
    ({ bundle } = await persistSceneVideo(bundle, shortPkg, sceneId, video));
    return {
      ok: true,
      status: 200,
      atomId,
      sceneId,
      video,
      bundle,
      message: "Video generated",
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message.slice(0, 400) : "Video generation failed";
    const completedAt = new Date().toISOString();
    const video: SceneVideoState = {
      status: "failed",
      ...priorSucceededAssetFields(priorVideo),
      promptUsed: veoPrompt,
      sourceImageUrl,
      sourceImageRef,
      attempt,
      requestedAt,
      startedAt: requestedAt,
      completedAt,
      updatedAt: completedAt,
      error: {
        code: "short_video.provider_failed",
        message,
        retryable: true,
      },
    };
    try {
      ({ bundle } = await persistSceneVideo(bundle, shortPkg, sceneId, video));
    } catch {
      /* best-effort */
    }
    return {
      ok: false,
      status: 502,
      error: message,
      code: "short_video.provider_failed",
      bundle,
      video,
    };
  }
}
