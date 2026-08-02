import { buildOnScreenTextLayout } from "@/brain/content-studio/on-screen-text-layout";
import {
  defaultComposeOutputSpec,
  type ComposeSceneVideoRequest,
} from "@/brain/render";

import { isAssetCurrent, isAssetStale } from "../asset-stale-rules";
import {
  checkInFlight,
  nextAttempt,
  priorSucceededAssetFields,
} from "../in-flight-guard";
import type { ResolvedLockedShortScene } from "../resolve-locked-short-scene";
import { resolveLockedShortScene } from "../resolve-locked-short-scene";
import type { SceneComposedVideoState } from "../scene-composed-video-state";

import { persistComposedVideo } from "./persist-composed-video";
import type {
  RenderSavedSceneComposedVideoInput,
  RenderSavedSceneComposedVideoResult,
} from "./types";

const NARRATION_DRIFT_MESSAGE =
  "Saved narration has changed since this voice was generated. Regenerate Voice before composing the scene.";

export type PreparedComposedVideo = ResolvedLockedShortScene & {
  visual: ComposeSceneVideoRequest["visual"];
  stillUrl: string;
  voiceUrl: string;
  voiceDuration: number;
  scriptUsed: string;
  onScreenText: string;
  composeRequest: ComposeSceneVideoRequest;
  attempt: number;
  priorComposed: SceneComposedVideoState | undefined;
};

export async function prepareComposedVideo(
  input: RenderSavedSceneComposedVideoInput
): Promise<
  | { ok: true; prepared: PreparedComposedVideo }
  | { ok: false; result: RenderSavedSceneComposedVideoResult }
> {
  const resolved = await resolveLockedShortScene({
    atomId: input.atomId,
    sceneId: input.sceneId,
    companyIdHint: input.companyIdHint,
    formatId: input.formatId,
    codePrefix: "short_compose",
    featureLabel: "scene composition",
    lockedAction: "composing scene video",
  });
  if (!resolved.ok) {
    return { ok: false, result: resolved };
  }

  let { bundle, shortPkg } = resolved.resolved;
  const { scene } = resolved.resolved;

  const inFlight = checkInFlight(scene.composedVideo, "compose");
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
    const recovered: SceneComposedVideoState = {
      ...scene.composedVideo,
      ...priorSucceededAssetFields(scene.composedVideo),
      status: "failed",
      updatedAt: now,
      completedAt: now,
      error: {
        code: inFlight.code,
        message: inFlight.error,
        retryable: true,
      },
    };
    ({ bundle, shortPkg } = await persistComposedVideo(
      bundle,
      shortPkg,
      resolved.resolved.sceneId,
      recovered
    ));
    // Explicit operator retry required — do not continue in this request.
    return {
      ok: false,
      result: {
        ok: false,
        status: 409,
        error: inFlight.error,
        code: inFlight.code,
        bundle,
        composedVideo: recovered,
      },
    };
  }

  const stillUrl = scene.render?.assetUrl?.trim() || "";
  if (isAssetStale(scene.render?.status)) {
    return {
      ok: false,
      result: {
        ok: false,
        status: 422,
        error:
          "Scene still is outdated — regenerate the image before composing",
        code: "short_compose.stale_still",
        bundle,
      },
    };
  }
  if (!isAssetCurrent(scene.render?.status) || !stillUrl) {
    return {
      ok: false,
      result: {
        ok: false,
        status: 422,
        error: "Generate a scene image first — composition needs a saved still",
        code: "short_compose.missing_still",
        bundle,
      },
    };
  }

  const voice = scene.voice;
  const voiceUrl = voice?.assetUrl?.trim() || "";
  const voiceDuration = voice?.durationSeconds;
  if (isAssetStale(voice?.status)) {
    return {
      ok: false,
      result: {
        ok: false,
        status: 422,
        error:
          "Scene voice is outdated — regenerate voice before composing",
        code: "short_compose.stale_voice",
        bundle,
      },
    };
  }
  if (
    !isAssetCurrent(voice?.status) ||
    !voiceUrl ||
    voiceDuration == null ||
    !(voiceDuration > 0)
  ) {
    return {
      ok: false,
      result: {
        ok: false,
        status: 422,
        error:
          "Generate scene voice with a verified duration before composing the MP4",
        code: "short_compose.missing_voice",
        bundle,
      },
    };
  }

  const scriptUsed = voice?.scriptUsed?.trim() ?? "";
  if (!scriptUsed) {
    return {
      ok: false,
      result: {
        ok: false,
        status: 422,
        error: "Voice is missing scriptUsed — regenerate voice before composing",
        code: "short_compose.missing_voice_script",
        bundle,
      },
    };
  }
  if (scene.narration.trim() !== scriptUsed) {
    return {
      ok: false,
      result: {
        ok: false,
        status: 422,
        error: NARRATION_DRIFT_MESSAGE,
        code: "short_compose.narration_drift",
        bundle,
      },
    };
  }

  const assetType = scene.assetType ?? "image";
  let visual: ComposeSceneVideoRequest["visual"] = {
    kind: "still",
    url: stillUrl,
  };

  if (assetType === "video") {
    const motionUrl = scene.video?.assetUrl?.trim() || "";
    if (isAssetStale(scene.video?.status)) {
      return {
        ok: false,
        result: {
          ok: false,
          status: 422,
          error:
            "Scene motion is outdated — regenerate video before composing",
          code: "short_compose.stale_motion",
          bundle,
        },
      };
    }
    if (!isAssetCurrent(scene.video?.status) || !motionUrl) {
      return {
        ok: false,
        result: {
          ok: false,
          status: 422,
          error:
            "Generate and approve scene video first — composition needs a saved motion clip",
          code: "short_compose.missing_motion",
          bundle,
        },
      };
    }
    visual = { kind: "motion", url: motionUrl };
  }

  const onScreenText = scene.onScreenText ?? "";
  const layout = buildOnScreenTextLayout({
    onScreenText,
    sceneOrder: scene.order,
    showSceneBadge: false,
  });
  const composeRequest: ComposeSceneVideoRequest = {
    visual,
    audioUrl: voiceUrl,
    durationSeconds: voiceDuration,
    output: defaultComposeOutputSpec(),
    titleOverlay: {
      titleLines: layout.titleLines,
      supportingText: layout.support,
      disclaimer: layout.disclaimer,
      sceneLabel: layout.sceneLabel,
      showSceneBadge: layout.showSceneBadge,
      accentWord: layout.accentWord,
    },
  };

  return {
    ok: true,
    prepared: {
      ...resolved.resolved,
      bundle,
      shortPkg,
      scene,
      visual,
      stillUrl,
      voiceUrl,
      voiceDuration,
      scriptUsed,
      onScreenText,
      composeRequest,
      attempt: nextAttempt(scene.composedVideo),
      priorComposed: scene.composedVideo,
    },
  };
}
