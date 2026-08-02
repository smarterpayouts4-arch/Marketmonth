import type { YouTubeShortFormatPackage } from "@/brain/content-studio/schemas/format-package";

import { markDownstreamAfterStillRegen } from "../asset-stale-rules";
import { persistShortPackage } from "../persist-short-package";
import type { SceneRenderState } from "../scene-render-state";

export { persistShortPackage };

export function priorAssetFields(prior: SceneRenderState | undefined) {
  if (!prior?.assetUrl && !prior?.assetRef) return {};
  return {
    assetRef: prior.assetRef,
    assetUrl: prior.assetUrl,
    mimeType: prior.mimeType,
    width: prior.width,
    height: prior.height,
    storageProvider: prior.storageProvider,
    storageFileId: prior.storageFileId,
  };
}

export function withSceneRender(
  pkg: YouTubeShortFormatPackage,
  sceneId: string,
  render: SceneRenderState
): YouTubeShortFormatPackage {
  const next: YouTubeShortFormatPackage = {
    ...pkg,
    scenes: pkg.scenes.map((scene) =>
      scene.id === sceneId ? { ...scene, render } : scene
    ),
  };
  if (
    render.status === "succeeded" ||
    render.status === "dry_run_succeeded"
  ) {
    return markDownstreamAfterStillRegen(next, sceneId);
  }
  return next;
}
