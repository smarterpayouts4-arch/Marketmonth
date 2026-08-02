import type {
  SceneCard,
  YouTubeShortFormatPackage,
} from "@/brain/content-studio/schemas/format-package";

import {
  youtubeShortDurableEditsSchema,
  youtubeShortDurableSceneEditSchema,
  youtubeShortGeneratedBaselineSchema,
  type YouTubeShortDurableEdits,
  type YouTubeShortDurableSceneBaseline,
  type YouTubeShortDurableSceneEdit,
  type YouTubeShortGeneratedBaseline,
} from "./youtube-short-draft";

function sceneBaselineFromScene(
  scene: SceneCard
): YouTubeShortDurableSceneBaseline {
  return {
    visualPrompt: scene.visualPrompt,
    narration: scene.narration,
    onScreenText: scene.onScreenText,
    motionPrompt: scene.motionPrompt,
    assetType: scene.assetType ?? "image",
  };
}

export function baselineFromPackage(
  pkg: YouTubeShortFormatPackage
): YouTubeShortGeneratedBaseline {
  const scenes: Record<string, YouTubeShortDurableSceneBaseline> = {};
  for (const scene of pkg.scenes) {
    scenes[scene.id] = sceneBaselineFromScene(scene);
  }
  return youtubeShortGeneratedBaselineSchema.parse({
    imagePrompt: pkg.imagePrompt,
    voiceoverPrompt: pkg.voiceoverPrompt,
    script: pkg.script,
    globalVisualStyle: pkg.globalVisualStyle,
    scenes,
  });
}

/**
 * Field-by-field effective scene:
 *   { ...generatedScene, ...generatedBaselineScene, ...durableSceneEdit }
 */
export function resolveEffectiveScene(
  generatedScene: SceneCard,
  baselineScene: YouTubeShortDurableSceneBaseline | undefined,
  durableSceneEdit: YouTubeShortDurableSceneEdit | undefined
): SceneCard {
  return {
    ...generatedScene,
    ...(baselineScene ?? {}),
    ...(durableSceneEdit ?? {}),
  };
}

export function applyEffectiveFieldsToShortPackage(
  pkg: YouTubeShortFormatPackage
): YouTubeShortFormatPackage {
  const baseline = pkg.generatedBaseline ?? baselineFromPackage(pkg);
  const durable = pkg.durableEdits;

  const scenes = pkg.scenes.map((scene) =>
    resolveEffectiveScene(
      scene,
      baseline.scenes[scene.id],
      durable?.scenes?.[scene.id]
    )
  );

  const globalVisualStyle =
    durable?.globalVisualStyle ?? baseline.globalVisualStyle;

  return {
    ...pkg,
    generatedBaseline: baseline,
    imagePrompt: durable?.imagePrompt ?? baseline.imagePrompt,
    voiceoverPrompt: durable?.voiceoverPrompt ?? baseline.voiceoverPrompt,
    script: durable?.script ?? baseline.script,
    globalVisualStyle,
    scenes,
  };
}

/** Merge sparse incoming durable edits into existing (scenes merged per id, field-level). */
export function mergeDurableEdits(
  existing: YouTubeShortDurableEdits | undefined,
  incoming: YouTubeShortDurableEdits
): YouTubeShortDurableEdits {
  const parsedIncoming = youtubeShortDurableEditsSchema.parse(incoming);
  const mergedScenes: Record<string, YouTubeShortDurableSceneEdit> = {
    ...(existing?.scenes ?? {}),
  };

  if (parsedIncoming.scenes) {
    for (const [sceneId, patch] of Object.entries(parsedIncoming.scenes)) {
      const next = {
        ...(mergedScenes[sceneId] ?? {}),
        ...patch,
      };
      const cleaned: YouTubeShortDurableSceneEdit = {};
      if (next.visualPrompt !== undefined) cleaned.visualPrompt = next.visualPrompt;
      if (next.narration !== undefined) cleaned.narration = next.narration;
      if (next.onScreenText !== undefined) cleaned.onScreenText = next.onScreenText;
      if (next.motionPrompt !== undefined) cleaned.motionPrompt = next.motionPrompt;
      if (next.assetType !== undefined) cleaned.assetType = next.assetType;
      if (Object.keys(cleaned).length === 0) {
        delete mergedScenes[sceneId];
      } else {
        mergedScenes[sceneId] =
          youtubeShortDurableSceneEditSchema.parse(cleaned);
      }
    }
  }

  const merged: YouTubeShortDurableEdits = {
    ...(existing ?? {}),
  };
  if (parsedIncoming.imagePrompt !== undefined) {
    merged.imagePrompt = parsedIncoming.imagePrompt;
  }
  if (parsedIncoming.voiceoverPrompt !== undefined) {
    merged.voiceoverPrompt = parsedIncoming.voiceoverPrompt;
  }
  if (parsedIncoming.script !== undefined) {
    merged.script = parsedIncoming.script;
  }
  if (parsedIncoming.globalVisualStyle !== undefined) {
    merged.globalVisualStyle = parsedIncoming.globalVisualStyle;
  }
  if (Object.keys(mergedScenes).length > 0) {
    merged.scenes = mergedScenes;
  } else {
    delete merged.scenes;
  }

  return youtubeShortDurableEditsSchema.parse(merged);
}

/**
 * Locked merge policy (ADR 0006 / Phase 2–3B):
 * - Effective fields merge field-by-field over generatedBaseline.
 * - On regenerate: refresh generatedBaseline; re-apply prior durableEdits.
 * - PATCH merges into existing durableEdits (sparse scene map preserved).
 */
export function applyDurableEditsToShortPackage(
  pkg: YouTubeShortFormatPackage,
  edits: YouTubeShortDurableEdits
): YouTubeShortFormatPackage {
  const baseline = pkg.generatedBaseline ?? baselineFromPackage(pkg);
  const durableEdits = mergeDurableEdits(pkg.durableEdits, edits);
  return applyEffectiveFieldsToShortPackage({
    ...pkg,
    generatedBaseline: baseline,
    durableEdits,
  });
}

export function resetShortPackageToGeneratedBaseline(
  pkg: YouTubeShortFormatPackage
): YouTubeShortFormatPackage {
  const baseline = pkg.generatedBaseline ?? baselineFromPackage(pkg);
  const scenes = pkg.scenes.map((scene) =>
    resolveEffectiveScene(scene, baseline.scenes[scene.id], undefined)
  );
  return {
    ...pkg,
    durableEdits: undefined,
    imagePrompt: baseline.imagePrompt,
    voiceoverPrompt: baseline.voiceoverPrompt,
    script: baseline.script,
    globalVisualStyle: baseline.globalVisualStyle,
    scenes,
    generatedBaseline: baseline,
  };
}

export function resetShortSceneToGeneratedBaseline(
  pkg: YouTubeShortFormatPackage,
  sceneId: string
): YouTubeShortFormatPackage {
  const baseline = pkg.generatedBaseline ?? baselineFromPackage(pkg);
  if (!pkg.scenes.some((s) => s.id === sceneId)) {
    throw new Error(`Unknown scene id: ${sceneId}`);
  }

  const nextScenesMap = { ...(pkg.durableEdits?.scenes ?? {}) };
  delete nextScenesMap[sceneId];

  let durableEdits: YouTubeShortDurableEdits | undefined = pkg.durableEdits
    ? { ...pkg.durableEdits }
    : undefined;

  if (durableEdits) {
    if (Object.keys(nextScenesMap).length > 0) {
      durableEdits.scenes = nextScenesMap;
    } else {
      delete durableEdits.scenes;
    }
    const hasPackageOverride =
      durableEdits.imagePrompt !== undefined ||
      durableEdits.voiceoverPrompt !== undefined ||
      durableEdits.script !== undefined ||
      durableEdits.globalVisualStyle !== undefined;
    if (!hasPackageOverride && !durableEdits.scenes) {
      durableEdits = undefined;
    } else if (durableEdits) {
      durableEdits = youtubeShortDurableEditsSchema.parse(durableEdits);
    }
  }

  return applyEffectiveFieldsToShortPackage({
    ...pkg,
    generatedBaseline: baseline,
    durableEdits,
  });
}
