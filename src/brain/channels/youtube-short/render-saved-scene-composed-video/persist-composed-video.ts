import type {
  ContentProductionBundle,
  YouTubeShortFormatPackage,
} from "@/brain/content-studio/schemas/format-package";

import { markDownstreamAfterComposeRegen } from "../asset-stale-rules";
import { persistShortPackage } from "../persist-short-package";
import type { SceneComposedVideoState } from "../scene-composed-video-state";

export function withComposedVideo(
  pkg: YouTubeShortFormatPackage,
  sceneId: string,
  composedVideo: SceneComposedVideoState
): YouTubeShortFormatPackage {
  const next: YouTubeShortFormatPackage = {
    ...pkg,
    scenes: pkg.scenes.map((s) =>
      s.id === sceneId ? { ...s, composedVideo } : s
    ),
  };
  if (
    composedVideo.status === "succeeded" ||
    composedVideo.status === "stubbed"
  ) {
    return markDownstreamAfterComposeRegen(next);
  }
  return next;
}

export async function persistComposedVideo(
  bundle: ContentProductionBundle,
  shortPkg: YouTubeShortFormatPackage,
  sceneId: string,
  composedVideo: SceneComposedVideoState
): Promise<{
  bundle: ContentProductionBundle;
  shortPkg: YouTubeShortFormatPackage;
}> {
  const nextPkg = withComposedVideo(shortPkg, sceneId, composedVideo);
  const nextBundle = await persistShortPackage(bundle, nextPkg);
  return { bundle: nextBundle, shortPkg: nextPkg };
}
