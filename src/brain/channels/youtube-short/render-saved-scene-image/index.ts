import type {
  SceneCard,
  YouTubeShortFormatPackage,
} from "@/brain/content-studio/schemas/format-package";

import type { SceneRenderState } from "../scene-render-state";

export { renderYouTubeShortSavedSceneImage } from "./render-saved-scene-image";
export type {
  RenderSavedSceneImageInput,
  RenderSavedSceneImageResult,
} from "./types";

/** Test helper: read scene card render from a package. */
export function getSceneRenderState(
  pkg: YouTubeShortFormatPackage,
  sceneId: string
): SceneRenderState | undefined {
  const scene: SceneCard | undefined = pkg.scenes.find((s) => s.id === sceneId);
  return scene?.render;
}
