import type {
  SceneCard,
  YouTubeShortFormatPackage,
} from "@/brain/content-studio/schemas/format-package";

import type { SceneComposedVideoState } from "../scene-composed-video-state";
import type { SceneRenderState } from "../scene-render-state";
import type { SceneVideoState } from "../scene-video-state";
import type { SceneVoiceState } from "../scene-voice-state";

import { invalidateFinalShort } from "./cascades";
import { computeSceneStaleFlags } from "./flags";
import { markStale, textEq } from "./internal";
import type { SceneStaleFlags } from "./types";

function applyFlagsToScene(
  scene: SceneCard,
  flags: SceneStaleFlags,
  now: string
): SceneCard {
  let next: SceneCard = scene;
  if (flags.render) {
    next = {
      ...next,
      render: markStale(next.render as SceneRenderState | undefined, now),
    };
  }
  if (flags.voice) {
    next = {
      ...next,
      voice: markStale(next.voice as SceneVoiceState | undefined, now),
    };
  }
  if (flags.video) {
    next = {
      ...next,
      video: markStale(next.video as SceneVideoState | undefined, now),
    };
  }
  if (flags.composedVideo) {
    next = {
      ...next,
      composedVideo: markStale(
        next.composedVideo as SceneComposedVideoState | undefined,
        now
      ),
    };
  }
  return next;
}

function sceneStructureFingerprint(pkg: YouTubeShortFormatPackage): string {
  return [...pkg.scenes]
    .sort((a, b) => a.order - b.order)
    .map((s) => `${s.id}:${s.order}`)
    .join("|");
}

/**
 * After durable edits are applied, mark downstream assets stale when their
 * source fields changed. Preserves assetUrl for comparison; status becomes
 * `stale` so Ready/assembly gates exclude them.
 */
export function applyAssetStaleRules(
  before: YouTubeShortFormatPackage,
  after: YouTubeShortFormatPackage
): YouTubeShortFormatPackage {
  const now = new Date().toISOString();
  const beforeById = new Map(before.scenes.map((s) => [s.id, s]));
  let anyStale = false;

  const globalStyleChanged = !textEq(
    before.globalVisualStyle,
    after.globalVisualStyle
  );

  const scenes = after.scenes.map((scene) => {
    const prev = beforeById.get(scene.id);
    if (!prev) {
      // New scene — package assembly inputs changed.
      anyStale = true;
      return scene;
    }

    const flags = computeSceneStaleFlags(prev, scene);
    if (globalStyleChanged) {
      flags.render = true;
      flags.video = true;
      flags.composedVideo = true;
    }

    if (
      !flags.render &&
      !flags.voice &&
      !flags.video &&
      !flags.composedVideo
    ) {
      return scene;
    }

    anyStale = true;
    return applyFlagsToScene(scene, flags, now);
  });

  const structureChanged = sceneStructureFingerprint(before) !==
    sceneStructureFingerprint(after);
  if (structureChanged) {
    anyStale = true;
  }

  let next: YouTubeShortFormatPackage = { ...after, scenes };

  // Invalidate package-level final Short when any scene asset went stale
  // or scene set / order changed.
  if (anyStale) {
    next = invalidateFinalShort(next, now);
  }

  return next;
}
