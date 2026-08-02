import {
  composeSceneVideo,
  runMediaPreflight,
  uploadSceneComposedVideoToImageKit,
} from "@/brain/render";

import { priorSucceededAssetFields } from "../in-flight-guard";
import {
  renderStepLockKey,
  withRenderStepLock,
} from "../render-step-lock";
import type { SceneComposedVideoState } from "../scene-composed-video-state";

import { persistComposedVideo } from "./persist-composed-video";
import { prepareComposedVideo } from "./prepare-composed-video";
import type {
  RenderSavedSceneComposedVideoDeps,
  RenderSavedSceneComposedVideoInput,
  RenderSavedSceneComposedVideoResult,
} from "./types";

/**
 * Compose one saved Short scene into a durable 9:16 MP4
 * (still or Veo motion + static title + Gemini voice).
 * Persists composedVideo only — does not mutate scene.video.
 */
export async function renderYouTubeShortSavedSceneComposedVideo(
  input: RenderSavedSceneComposedVideoInput,
  deps: RenderSavedSceneComposedVideoDeps = {}
): Promise<RenderSavedSceneComposedVideoResult> {
  return withRenderStepLock(
    renderStepLockKey("compose", input.atomId, input.sceneId),
    () => renderYouTubeShortSavedSceneComposedVideoLocked(input, deps)
  );
}

async function renderYouTubeShortSavedSceneComposedVideoLocked(
  input: RenderSavedSceneComposedVideoInput,
  deps: RenderSavedSceneComposedVideoDeps
): Promise<RenderSavedSceneComposedVideoResult> {
  const preparedOutcome = await prepareComposedVideo(input);
  if (!preparedOutcome.ok) return preparedOutcome.result;

  let { bundle, shortPkg } = preparedOutcome.prepared;
  const {
    atomId,
    sceneId,
    stillUrl: imageUrl,
    visual,
    voiceUrl,
    scriptUsed,
    onScreenText,
    composeRequest,
    attempt,
    priorComposed,
  } = preparedOutcome.prepared;
  const sourceVisualUrl = visual.url;

  const requestedAt = new Date().toISOString();
  const running: SceneComposedVideoState = {
    status: "running",
    requestedAt,
    startedAt: requestedAt,
    attempt,
    updatedAt: requestedAt,
    sourceImageUrl: imageUrl,
    sourceVisualUrl,
    sourceVoiceUrl: voiceUrl,
    voiceScriptUsed: scriptUsed,
    onScreenTextUsed: onScreenText,
  };
  ({ bundle, shortPkg } = await persistComposedVideo(
    bundle,
    shortPkg,
    sceneId,
    running
  ));

  const runCompose = deps.composeSceneVideo ?? composeSceneVideo;
  const runUpload =
    deps.uploadComposedVideo ?? uploadSceneComposedVideoToImageKit;

  try {
    const media = await runCompose(composeRequest);
    const completedAt = new Date().toISOString();

    if (media.status === "stubbed") {
      const composedVideo: SceneComposedVideoState = {
        status: "stubbed",
        provider: media.provider,
        compositor: media.compositor,
        assetRef: media.asset_ref,
        width: media.width,
        height: media.height,
        durationSeconds: media.durationSeconds,
        sourceImageUrl: imageUrl,
        sourceVisualUrl,
        sourceVoiceUrl: voiceUrl,
        voiceScriptUsed: scriptUsed,
        onScreenTextUsed: onScreenText,
        attempt,
        requestedAt,
        startedAt: requestedAt,
        completedAt,
        updatedAt: completedAt,
      };
      ({ bundle } = await persistComposedVideo(
        bundle,
        shortPkg,
        sceneId,
        composedVideo
      ));
      return {
        ok: true,
        status: 200,
        atomId,
        sceneId,
        composedVideo,
        bundle,
        message:
          "Scene MP4 stubbed (set MM_SCENE_COMPOSE_RENDER=live and MM_SCENE_COMPOSITOR=ffmpeg)",
      };
    }

    if (!media.bytes?.length) {
      throw new Error("Composer returned no video bytes");
    }

    const preflight = await runMediaPreflight({
      source: { bytes: media.bytes, hintName: "scene-composed.mp4" },
      expectAudio: true,
      expectWidth: media.width || 1080,
      expectHeight: media.height || 1920,
      checkUrlReachable: false,
    });
    if (!preflight.ok) {
      throw new Error(`Compose validation failed: ${preflight.error}`);
    }

    const storedVideo = await runUpload({
      atomId,
      sceneId,
      bytes: media.bytes,
      mimeType: media.mimeType || "video/mp4",
    });

    const composedVideo: SceneComposedVideoState = {
      status: "succeeded",
      provider: media.provider,
      compositor: media.compositor,
      assetRef: storedVideo.assetRef,
      assetUrl: storedVideo.assetUrl,
      mimeType: storedVideo.mimeType,
      width: preflight.width,
      height: preflight.height,
      durationSeconds: preflight.durationSeconds,
      sourceImageUrl: imageUrl,
      sourceVisualUrl,
      sourceVoiceUrl: voiceUrl,
      voiceScriptUsed: scriptUsed,
      onScreenTextUsed: onScreenText,
      storageProvider: storedVideo.storageProvider,
      storageFileId: storedVideo.storageFileId,
      attempt,
      requestedAt,
      startedAt: requestedAt,
      completedAt,
      updatedAt: completedAt,
    };
    ({ bundle } = await persistComposedVideo(
      bundle,
      shortPkg,
      sceneId,
      composedVideo
    ));
    return {
      ok: true,
      status: 200,
      atomId,
      sceneId,
      composedVideo,
      bundle,
      message: "Scene MP4 composed",
    };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message.slice(0, 400)
        : "Scene composition failed";
    const completedAt = new Date().toISOString();
    const composedVideo: SceneComposedVideoState = {
      status: "failed",
      ...priorSucceededAssetFields(priorComposed),
      sourceImageUrl: imageUrl,
      sourceVisualUrl,
      sourceVoiceUrl: voiceUrl,
      voiceScriptUsed: scriptUsed,
      onScreenTextUsed: onScreenText,
      attempt,
      requestedAt,
      startedAt: requestedAt,
      completedAt,
      updatedAt: completedAt,
      error: {
        code: "short_compose.provider_failed",
        message,
        retryable: true,
      },
    };
    try {
      ({ bundle } = await persistComposedVideo(
        bundle,
        shortPkg,
        sceneId,
        composedVideo
      ));
    } catch {
      /* best-effort */
    }
    return {
      ok: false,
      status: 502,
      error: message,
      code: "short_compose.provider_failed",
      bundle,
      composedVideo,
    };
  }
}
