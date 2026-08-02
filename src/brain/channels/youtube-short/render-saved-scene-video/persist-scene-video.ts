import type {
  ContentProductionBundle,
  YouTubeShortFormatPackage,
} from "@/brain/content-studio/schemas/format-package";

import { markDownstreamAfterMotionRegen } from "../asset-stale-rules";
import { persistShortPackage } from "../persist-short-package";
import type { SceneVideoState } from "../scene-video-state";

export function withSceneVideo(
  pkg: YouTubeShortFormatPackage,
  sceneId: string,
  video: SceneVideoState
): YouTubeShortFormatPackage {
  const next: YouTubeShortFormatPackage = {
    ...pkg,
    scenes: pkg.scenes.map((s) =>
      s.id === sceneId ? { ...s, video } : s
    ),
  };
  if (video.status === "succeeded" || video.status === "stubbed") {
    return markDownstreamAfterMotionRegen(next, sceneId);
  }
  return next;
}

export function withoutSceneVideo(
  pkg: YouTubeShortFormatPackage,
  sceneId: string
): YouTubeShortFormatPackage {
  return {
    ...pkg,
    scenes: pkg.scenes.map((s) => {
      if (s.id !== sceneId) return s;
      const rest = { ...s };
      delete rest.video;
      return rest;
    }),
  };
}

export async function persistSceneVideo(
  bundle: ContentProductionBundle,
  shortPkg: YouTubeShortFormatPackage,
  sceneId: string,
  video: SceneVideoState
): Promise<{
  bundle: ContentProductionBundle;
  shortPkg: YouTubeShortFormatPackage;
}> {
  const nextPkg = withSceneVideo(shortPkg, sceneId, video);
  const nextBundle = await persistShortPackage(bundle, nextPkg);
  return { bundle: nextBundle, shortPkg: nextPkg };
}
