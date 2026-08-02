import type { YouTubeShortFormatPackage } from "@/brain/content-studio/schemas/format-package";

import type { SceneComposedVideoState } from "../scene-composed-video-state";
import type { SceneVideoState } from "../scene-video-state";

import { MARKABLE, markStale } from "./internal";

/**
 * After a successful still regenerate, mark motion + composed (and package
 * finalShort) stale so they cannot be treated as final.
 */
export function markDownstreamAfterStillRegen(
  pkg: YouTubeShortFormatPackage,
  sceneId: string
): YouTubeShortFormatPackage {
  const now = new Date().toISOString();
  const scenes = pkg.scenes.map((scene) => {
    if (scene.id !== sceneId) return scene;
    return {
      ...scene,
      video: markStale(scene.video as SceneVideoState | undefined, now),
      composedVideo: markStale(
        scene.composedVideo as SceneComposedVideoState | undefined,
        now
      ),
    };
  });
  return invalidateFinalShort({ ...pkg, scenes }, now);
}

/** After successful voice regen, mark composed + finalShort stale. */
export function markDownstreamAfterVoiceRegen(
  pkg: YouTubeShortFormatPackage,
  sceneId: string
): YouTubeShortFormatPackage {
  const now = new Date().toISOString();
  const scenes = pkg.scenes.map((scene) => {
    if (scene.id !== sceneId) return scene;
    return {
      ...scene,
      composedVideo: markStale(
        scene.composedVideo as SceneComposedVideoState | undefined,
        now
      ),
    };
  });
  return invalidateFinalShort({ ...pkg, scenes }, now);
}

/** After successful motion regen, mark composed + finalShort stale. */
export function markDownstreamAfterMotionRegen(
  pkg: YouTubeShortFormatPackage,
  sceneId: string
): YouTubeShortFormatPackage {
  const now = new Date().toISOString();
  const scenes = pkg.scenes.map((scene) => {
    if (scene.id !== sceneId) return scene;
    return {
      ...scene,
      composedVideo: markStale(
        scene.composedVideo as SceneComposedVideoState | undefined,
        now
      ),
    };
  });
  return invalidateFinalShort({ ...pkg, scenes }, now);
}

/**
 * After a scene composed MP4 succeeds, prior package finalShort is outdated.
 */
export function markDownstreamAfterComposeRegen(
  pkg: YouTubeShortFormatPackage
): YouTubeShortFormatPackage {
  return invalidateFinalShort(pkg, new Date().toISOString());
}

export function invalidateFinalShort(
  pkg: YouTubeShortFormatPackage,
  now: string = new Date().toISOString()
): YouTubeShortFormatPackage {
  if (!pkg.finalShort || !MARKABLE.has(pkg.finalShort.status)) return pkg;
  return {
    ...pkg,
    finalShort: {
      ...pkg.finalShort,
      status: "stale",
      updatedAt: now,
    },
  };
}
