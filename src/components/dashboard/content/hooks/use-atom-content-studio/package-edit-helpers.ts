import type {
  ContentFormatPackage,
  SceneCard,
  YouTubeShortFormatPackage,
} from "@/brain/content-studio";

import {
  EMPTY_SCENE,
  type FormatEdits,
  type SceneAssetType,
  type SceneEditFields,
} from "./types";

export function isShortPackage(
  pkg: ContentFormatPackage
): pkg is YouTubeShortFormatPackage {
  return pkg.formatId === "youtube_short";
}

export function resolveGlobalVisualStyle(
  pkg: ContentFormatPackage
): string {
  if (!isShortPackage(pkg)) return "";
  return (
    pkg.durableEdits?.globalVisualStyle ??
    pkg.generatedBaseline?.globalVisualStyle ??
    pkg.globalVisualStyle ??
    ""
  );
}

export function editsFromPackage(pkg: ContentFormatPackage): FormatEdits {
  return {
    imagePrompt: pkg.imagePrompt,
    voiceoverPrompt: pkg.voiceoverPrompt,
    script: pkg.script,
    globalVisualStyle: resolveGlobalVisualStyle(pkg),
  };
}

export function baselineEditsFromPackage(pkg: ContentFormatPackage): FormatEdits {
  if (isShortPackage(pkg) && pkg.generatedBaseline) {
    return {
      imagePrompt: pkg.generatedBaseline.imagePrompt,
      voiceoverPrompt: pkg.generatedBaseline.voiceoverPrompt,
      script: pkg.generatedBaseline.script,
      globalVisualStyle: pkg.generatedBaseline.globalVisualStyle ?? "",
    };
  }
  return editsFromPackage(pkg);
}

export function sceneFieldsFromScene(scene: SceneCard): SceneEditFields {
  return {
    visualPrompt: scene.visualPrompt,
    narration: scene.narration,
    onScreenText: scene.onScreenText ?? "",
    assetType: scene.assetType ?? "image",
  };
}

export function baselineSceneFields(
  pkg: YouTubeShortFormatPackage,
  sceneId: string
): SceneEditFields {
  const baseline = pkg.generatedBaseline?.scenes?.[sceneId];
  if (baseline) {
    return {
      visualPrompt: baseline.visualPrompt,
      narration: baseline.narration,
      onScreenText: baseline.onScreenText ?? "",
      assetType: baseline.assetType,
    };
  }
  const scene = pkg.scenes.find((s) => s.id === sceneId);
  return scene ? sceneFieldsFromScene(scene) : EMPTY_SCENE;
}

export function sceneEditsFromPackage(
  pkg: YouTubeShortFormatPackage
): Record<string, SceneEditFields> {
  const out: Record<string, SceneEditFields> = {};
  for (const scene of pkg.scenes) {
    out[scene.id] = sceneFieldsFromScene(scene);
  }
  return out;
}

export function shortHasDurableEdits(pkg: ContentFormatPackage | null): boolean {
  if (!pkg || !isShortPackage(pkg) || !pkg.durableEdits) return false;
  const d = pkg.durableEdits;
  return Boolean(
    d.imagePrompt !== undefined ||
      d.voiceoverPrompt !== undefined ||
      d.script !== undefined ||
      d.globalVisualStyle !== undefined ||
      (d.scenes && Object.keys(d.scenes).length > 0)
  );
}

export type ScenePatch = {
  visualPrompt?: string;
  narration?: string;
  onScreenText?: string;
  assetType?: SceneAssetType;
};

export function buildScenePatches(
  pkg: YouTubeShortFormatPackage,
  localById: Record<string, SceneEditFields>
): Record<string, ScenePatch> {
  const patches: Record<string, ScenePatch> = {};
  for (const scene of pkg.scenes) {
    const local = localById[scene.id];
    if (!local) continue;
    const current = sceneFieldsFromScene(scene);
    const patch: ScenePatch = {};
    if (local.visualPrompt !== current.visualPrompt) {
      patch.visualPrompt = local.visualPrompt;
    }
    if (local.narration !== current.narration) {
      patch.narration = local.narration;
    }
    if (local.onScreenText !== current.onScreenText) {
      patch.onScreenText = local.onScreenText;
    }
    if (local.assetType !== current.assetType) {
      patch.assetType = local.assetType;
    }
    if (Object.keys(patch).length > 0) {
      patches[scene.id] = patch;
    }
  }
  return patches;
}
