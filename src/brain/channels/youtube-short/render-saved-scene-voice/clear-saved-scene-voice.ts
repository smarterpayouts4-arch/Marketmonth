import { deleteSceneVoiceFromImageKit } from "@/brain/render";

import { persistShortPackage } from "../persist-short-package";
import { resolveLockedShortScene } from "../resolve-locked-short-scene";

import { withoutSceneVoice } from "./persist-scene-voice";
import type {
  ClearSavedSceneVoiceResult,
  RenderSavedSceneVoiceDeps,
  RenderSavedSceneVoiceInput,
} from "./types";

/**
 * Clear persisted voice for one Short scene (omit scene.voice).
 * Best-effort ImageKit delete of the current storageFileId when present.
 */
export async function clearYouTubeShortSavedSceneVoice(
  input: RenderSavedSceneVoiceInput,
  deps: Pick<RenderSavedSceneVoiceDeps, "deleteSceneVoice"> = {}
): Promise<ClearSavedSceneVoiceResult> {
  const resolved = await resolveLockedShortScene({
    atomId: input.atomId,
    sceneId: input.sceneId,
    companyIdHint: input.companyIdHint,
    formatId: input.formatId,
    codePrefix: "short_voice",
    featureLabel: "scene voice",
    lockedAction: "clearing voice",
  });
  if (!resolved.ok) return resolved;

  const { atomId, sceneId, bundle, shortPkg, scene } = resolved.resolved;

  const priorFileId = scene.voice?.storageFileId?.trim() || "";
  let storageDeleteAttempted = false;
  let storageDeleteOk: boolean | null = null;
  if (priorFileId) {
    storageDeleteAttempted = true;
    const runDelete = deps.deleteSceneVoice ?? deleteSceneVoiceFromImageKit;
    const deleted = await runDelete(priorFileId);
    storageDeleteOk = deleted.ok;
  }

  const nextPkg = withoutSceneVoice(shortPkg, sceneId);
  const nextBundle = await persistShortPackage(bundle, nextPkg);

  return {
    ok: true,
    status: 200,
    atomId,
    sceneId,
    bundle: nextBundle,
    message: "Voice cleared",
    storageDeleteAttempted,
    storageDeleteOk,
  };
}
