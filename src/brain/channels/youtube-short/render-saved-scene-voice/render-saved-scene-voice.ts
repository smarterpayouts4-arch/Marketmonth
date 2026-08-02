import {
  defaultVoiceProviderConfig,
  generateVoice,
  uploadSceneVoiceToImageKit,
} from "@/brain/render";

import { priorSucceededAssetFields } from "../in-flight-guard";
import {
  renderStepLockKey,
  withRenderStepLock,
} from "../render-step-lock";
import type { SceneVoiceState } from "../scene-voice-state";

import { persistSceneVoice } from "./persist-scene-voice";
import { prepareSceneVoice } from "./prepare-scene-voice";
import type {
  RenderSavedSceneVoiceDeps,
  RenderSavedSceneVoiceInput,
  RenderSavedSceneVoiceResult,
} from "./types";

/**
 * Generate voiceover for one saved Short scene from durable narration.
 * Live when MM_VOICE_RENDER=live; otherwise persists stubbed state.
 */
export async function renderYouTubeShortSavedSceneVoice(
  input: RenderSavedSceneVoiceInput,
  deps: RenderSavedSceneVoiceDeps = {}
): Promise<RenderSavedSceneVoiceResult> {
  return withRenderStepLock(
    renderStepLockKey("voice", input.atomId, input.sceneId),
    () => renderYouTubeShortSavedSceneVoiceLocked(input, deps)
  );
}

async function renderYouTubeShortSavedSceneVoiceLocked(
  input: RenderSavedSceneVoiceInput,
  deps: RenderSavedSceneVoiceDeps
): Promise<RenderSavedSceneVoiceResult> {
  const preparedOutcome = await prepareSceneVoice(input);
  if (!preparedOutcome.ok) return preparedOutcome.result;

  let { bundle, shortPkg } = preparedOutcome.prepared;
  const { atomId, sceneId, narration, attempt, priorVoice } =
    preparedOutcome.prepared;

  const requestedAt = new Date().toISOString();
  const running: SceneVoiceState = {
    status: "running",
    requestedAt,
    startedAt: requestedAt,
    attempt,
    updatedAt: requestedAt,
    scriptUsed: narration,
  };
  ({ bundle, shortPkg } = await persistSceneVoice(
    bundle,
    shortPkg,
    sceneId,
    running
  ));

  const runGenerate = deps.generateVoice ?? generateVoice;
  const runUpload = deps.uploadSceneVoice ?? uploadSceneVoiceToImageKit;

  try {
    const media = await runGenerate(narration, defaultVoiceProviderConfig());
    const completedAt = new Date().toISOString();

    if (media.status === "stubbed" || media.status === "skipped") {
      const voice: SceneVoiceState = {
        status: media.status === "stubbed" ? "stubbed" : "idle",
        provider: media.provider,
        model: media.model,
        assetRef: media.asset_ref || undefined,
        scriptUsed: media.script_used,
        attempt,
        requestedAt,
        startedAt: requestedAt,
        completedAt,
        updatedAt: completedAt,
      };
      ({ bundle, shortPkg } = await persistSceneVoice(
        bundle,
        shortPkg,
        sceneId,
        voice
      ));
      return {
        ok: true,
        status: 200,
        atomId,
        sceneId,
        voice,
        bundle,
        message:
          media.status === "stubbed"
            ? "Voice stubbed (set MM_VOICE_RENDER=live for TTS)"
            : "Voice skipped — empty narration",
      };
    }

    if (!media.bytes?.length) {
      throw new Error("Voice provider returned no audio bytes");
    }

    const storedAudio = await runUpload({
      atomId,
      sceneId,
      bytes: media.bytes,
      mimeType: media.mimeType || "audio/mpeg",
    });

    const voice: SceneVoiceState = {
      status: "succeeded",
      provider: media.provider,
      model: media.model,
      assetRef: storedAudio.assetRef,
      assetUrl: storedAudio.assetUrl,
      mimeType: storedAudio.mimeType,
      ...(media.durationSeconds != null && media.durationSeconds > 0
        ? { durationSeconds: media.durationSeconds }
        : {}),
      scriptUsed: media.script_used,
      storageProvider: storedAudio.storageProvider,
      storageFileId: storedAudio.storageFileId,
      attempt,
      requestedAt,
      startedAt: requestedAt,
      completedAt,
      updatedAt: completedAt,
    };
    ({ bundle } = await persistSceneVoice(bundle, shortPkg, sceneId, voice));
    return {
      ok: true,
      status: 200,
      atomId,
      sceneId,
      voice,
      bundle,
      message: "Voice generated",
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message.slice(0, 400) : "Voice generation failed";
    const completedAt = new Date().toISOString();
    const voice: SceneVoiceState = {
      status: "failed",
      ...priorSucceededAssetFields(priorVoice),
      scriptUsed: narration,
      attempt,
      requestedAt,
      startedAt: requestedAt,
      completedAt,
      updatedAt: completedAt,
      error: {
        code: "short_voice.provider_failed",
        message,
        retryable: true,
      },
    };
    try {
      ({ bundle } = await persistSceneVoice(bundle, shortPkg, sceneId, voice));
    } catch {
      /* best-effort */
    }
    return {
      ok: false,
      status: 502,
      error: message,
      code: "short_voice.provider_failed",
      bundle,
      voice,
    };
  }
}
