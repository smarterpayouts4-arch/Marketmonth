import type {
  ContentProductionBundle,
  YouTubeShortFormatPackage,
} from "@/brain/content-studio/schemas/format-package";

import { markDownstreamAfterVoiceRegen } from "../asset-stale-rules";
import { persistShortPackage } from "../persist-short-package";
import type { SceneVoiceState } from "../scene-voice-state";

export function withSceneVoice(
  pkg: YouTubeShortFormatPackage,
  sceneId: string,
  voice: SceneVoiceState
): YouTubeShortFormatPackage {
  const next: YouTubeShortFormatPackage = {
    ...pkg,
    scenes: pkg.scenes.map((s) =>
      s.id === sceneId ? { ...s, voice } : s
    ),
  };
  if (voice.status === "succeeded" || voice.status === "stubbed") {
    return markDownstreamAfterVoiceRegen(next, sceneId);
  }
  return next;
}

export function withoutSceneVoice(
  pkg: YouTubeShortFormatPackage,
  sceneId: string
): YouTubeShortFormatPackage {
  return {
    ...pkg,
    scenes: pkg.scenes.map((s) => {
      if (s.id !== sceneId) return s;
      const rest = { ...s };
      delete rest.voice;
      return rest;
    }),
  };
}

export async function persistSceneVoice(
  bundle: ContentProductionBundle,
  shortPkg: YouTubeShortFormatPackage,
  sceneId: string,
  voice: SceneVoiceState
): Promise<{
  bundle: ContentProductionBundle;
  shortPkg: YouTubeShortFormatPackage;
}> {
  const nextPkg = withSceneVoice(shortPkg, sceneId, voice);
  const nextBundle = await persistShortPackage(bundle, nextPkg);
  return { bundle: nextBundle, shortPkg: nextPkg };
}
