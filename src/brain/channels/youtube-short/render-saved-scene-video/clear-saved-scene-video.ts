import { deleteSceneVideoFromImageKit } from "@/brain/render";

import { persistShortPackage } from "../persist-short-package";
import { resolveLockedShortScene } from "../resolve-locked-short-scene";

import { withoutSceneVideo } from "./persist-scene-video";
import type {
  ClearSavedSceneVideoResult,
  RenderSavedSceneVideoDeps,
  RenderSavedSceneVideoInput,
} from "./types";

/**
 * Clear persisted video for one Short scene (omit scene.video).
 * Best-effort ImageKit delete of the current storageFileId when present.
 */
export async function clearYouTubeShortSavedSceneVideo(
  input: RenderSavedSceneVideoInput,
  deps: Pick<RenderSavedSceneVideoDeps, "deleteSceneVideo"> = {}
): Promise<ClearSavedSceneVideoResult> {
  const resolved = await resolveLockedShortScene({
    atomId: input.atomId,
    sceneId: input.sceneId,
    companyIdHint: input.companyIdHint,
    formatId: input.formatId,
    codePrefix: "short_video",
    featureLabel: "scene video",
    lockedAction: "clearing video",
  });
  if (!resolved.ok) return resolved;

  const { atomId, sceneId, bundle, shortPkg, scene } = resolved.resolved;

  const priorFileId = scene.video?.storageFileId?.trim() || "";
  let storageDeleteAttempted = false;
  let storageDeleteOk: boolean | null = null;
  if (priorFileId) {
    storageDeleteAttempted = true;
    const runDelete = deps.deleteSceneVideo ?? deleteSceneVideoFromImageKit;
    const deleted = await runDelete(priorFileId);
    storageDeleteOk = deleted.ok;
  }

  const nextPkg = withoutSceneVideo(shortPkg, sceneId);
  const nextBundle = await persistShortPackage(bundle, nextPkg);

  return {
    ok: true,
    status: 200,
    atomId,
    sceneId,
    bundle: nextBundle,
    message: "Video cleared",
    storageDeleteAttempted,
    storageDeleteOk,
  };
}
