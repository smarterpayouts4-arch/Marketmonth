import { composeEffectiveVeoPrompt } from "../compose-effective-veo-prompt";
import {
  checkInFlight,
  nextAttempt,
  priorSucceededAssetFields,
} from "../in-flight-guard";
import type { ResolvedLockedShortScene } from "../resolve-locked-short-scene";
import { resolveLockedShortScene } from "../resolve-locked-short-scene";
import type { SceneVideoState } from "../scene-video-state";

import { persistSceneVideo } from "./persist-scene-video";
import type {
  RenderSavedSceneVideoInput,
  RenderSavedSceneVideoResult,
} from "./types";

export type PreparedSceneVideo = ResolvedLockedShortScene & {
  /** Effective prompt sent to Veo (motion-led). */
  veoPrompt: string;
  motionPrompt: string;
  visualPrompt: string;
  sourceImageUrl: string;
  sourceImageRef: string | undefined;
  attempt: number;
  priorVideo: SceneVideoState | undefined;
};

export async function prepareSceneVideo(
  input: RenderSavedSceneVideoInput
): Promise<
  | { ok: true; prepared: PreparedSceneVideo }
  | { ok: false; result: RenderSavedSceneVideoResult }
> {
  const resolved = await resolveLockedShortScene({
    atomId: input.atomId,
    sceneId: input.sceneId,
    companyIdHint: input.companyIdHint,
    formatId: input.formatId,
    codePrefix: "short_video",
    featureLabel: "scene video",
    lockedAction: "generating video",
  });
  if (!resolved.ok) {
    return { ok: false, result: resolved };
  }

  let { bundle, shortPkg } = resolved.resolved;
  const { scene } = resolved.resolved;
  const visualPrompt = scene.visualPrompt.trim();
  const motionPrompt = (scene.motionPrompt ?? "").trim();

  if (!motionPrompt) {
    return {
      ok: false,
      result: {
        ok: false,
        status: 422,
        error:
          "Add a Motion Prompt and save the scene before generating video",
        code: "short_video.empty_motion_prompt",
        bundle,
      },
    };
  }

  const sourceImageUrl = scene.render?.assetUrl?.trim() || "";
  if (!sourceImageUrl) {
    return {
      ok: false,
      result: {
        ok: false,
        status: 422,
        error: "Generate a scene image first — video needs a saved still",
        code: "short_video.missing_still",
        bundle,
      },
    };
  }

  const inFlight = checkInFlight(scene.video, "video");
  if (!inFlight.ok && inFlight.kind === "conflict") {
    return {
      ok: false,
      result: {
        ok: false,
        status: inFlight.status,
        error: inFlight.error,
        code: inFlight.code,
        bundle,
      },
    };
  }
  if (!inFlight.ok && inFlight.kind === "timed_out") {
    const now = new Date().toISOString();
    const recovered: SceneVideoState = {
      ...scene.video,
      ...priorSucceededAssetFields(scene.video),
      status: "failed",
      updatedAt: now,
      completedAt: now,
      error: {
        code: inFlight.code,
        message: inFlight.error,
        retryable: true,
      },
    };
    ({ bundle, shortPkg } = await persistSceneVideo(
      bundle,
      shortPkg,
      resolved.resolved.sceneId,
      recovered
    ));
    return {
      ok: false,
      result: {
        ok: false,
        status: 409,
        error: inFlight.error,
        code: inFlight.code,
        bundle,
        video: recovered,
      },
    };
  }

  const veoPrompt = composeEffectiveVeoPrompt({
    motionPrompt,
    visualPrompt,
  });

  return {
    ok: true,
    prepared: {
      ...resolved.resolved,
      bundle,
      shortPkg,
      scene,
      veoPrompt,
      motionPrompt,
      visualPrompt,
      sourceImageUrl,
      sourceImageRef: scene.render?.assetRef,
      attempt: nextAttempt(scene.video),
      priorVideo: scene.video,
    },
  };
}
