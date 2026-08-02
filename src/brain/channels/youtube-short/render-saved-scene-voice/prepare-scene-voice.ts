import {
  checkInFlight,
  nextAttempt,
  priorSucceededAssetFields,
} from "../in-flight-guard";
import type { ResolvedLockedShortScene } from "../resolve-locked-short-scene";
import { resolveLockedShortScene } from "../resolve-locked-short-scene";
import type { SceneVoiceState } from "../scene-voice-state";

import { persistSceneVoice } from "./persist-scene-voice";
import type {
  RenderSavedSceneVoiceInput,
  RenderSavedSceneVoiceResult,
} from "./types";

export type PreparedSceneVoice = ResolvedLockedShortScene & {
  narration: string;
  attempt: number;
  priorVoice: SceneVoiceState | undefined;
};

export async function prepareSceneVoice(
  input: RenderSavedSceneVoiceInput
): Promise<
  | { ok: true; prepared: PreparedSceneVoice }
  | { ok: false; result: RenderSavedSceneVoiceResult }
> {
  const resolved = await resolveLockedShortScene({
    atomId: input.atomId,
    sceneId: input.sceneId,
    companyIdHint: input.companyIdHint,
    formatId: input.formatId,
    codePrefix: "short_voice",
    featureLabel: "scene voice",
    lockedAction: "generating voice",
  });
  if (!resolved.ok) {
    return { ok: false, result: resolved };
  }

  let { bundle, shortPkg } = resolved.resolved;
  const { scene } = resolved.resolved;
  const narration = scene.narration.trim();
  if (!narration) {
    return {
      ok: false,
      result: {
        ok: false,
        status: 422,
        error:
          "Scene narration is empty — save narration before generating voice",
        code: "short_voice.empty_narration",
        bundle,
      },
    };
  }

  const inFlight = checkInFlight(scene.voice, "voice");
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
    const recovered: SceneVoiceState = {
      ...scene.voice,
      ...priorSucceededAssetFields(scene.voice),
      status: "failed",
      updatedAt: now,
      completedAt: now,
      error: {
        code: inFlight.code,
        message: inFlight.error,
        retryable: true,
      },
    };
    ({ bundle, shortPkg } = await persistSceneVoice(
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
        voice: recovered,
      },
    };
  }

  return {
    ok: true,
    prepared: {
      ...resolved.resolved,
      bundle,
      shortPkg,
      scene,
      narration,
      attempt: nextAttempt(scene.voice),
      priorVoice: scene.voice,
    },
  };
}
