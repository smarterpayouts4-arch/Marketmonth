import { randomBytes } from "node:crypto";

import type {
  SceneCard,
  YouTubeShortFormatPackage,
} from "@/brain/content-studio/schemas/format-package";

import {
  YOUTUBE_SHORT_SCENE_COUNT_MAX,
  YOUTUBE_SHORT_SCENE_COUNT_MIN,
  type YouTubeShortDurableSceneBaseline,
  type YouTubeShortSceneStructureAction,
} from "./youtube-short-draft";

const DEFAULT_EMPTY_SCENE_SECONDS = 5;

export function newManualSceneId(): string {
  return `sm_${randomBytes(6).toString("hex")}`;
}

export function createEmptySceneCard(order: number, id?: string): SceneCard {
  return {
    id: id ?? newManualSceneId(),
    order,
    durationSeconds: DEFAULT_EMPTY_SCENE_SECONDS,
    narration: "",
    onScreenText: "",
    visualPrompt: "",
    motionPrompt: "",
    assetType: "image",
  };
}

function emptyBaseline(): YouTubeShortDurableSceneBaseline {
  return {
    visualPrompt: "",
    narration: "",
    onScreenText: "",
    motionPrompt: "",
    assetType: "image",
  };
}

function renumberScenes(scenes: SceneCard[]): SceneCard[] {
  return scenes.map((scene, index) => ({ ...scene, order: index }));
}

function withUpdatedDuration(
  pkg: YouTubeShortFormatPackage,
  scenes: SceneCard[]
): YouTubeShortFormatPackage {
  const durationSeconds = scenes.reduce(
    (sum, scene) => sum + scene.durationSeconds,
    0
  );
  return { ...pkg, scenes, durationSeconds };
}

function ensureBaseline(
  pkg: YouTubeShortFormatPackage
): NonNullable<YouTubeShortFormatPackage["generatedBaseline"]> {
  const baseline = pkg.generatedBaseline ?? {
    imagePrompt: pkg.imagePrompt,
    voiceoverPrompt: pkg.voiceoverPrompt,
    script: pkg.script,
    globalVisualStyle: pkg.globalVisualStyle,
    scenes: {} as Record<string, YouTubeShortDurableSceneBaseline>,
  };
  const scenes = { ...baseline.scenes };
  for (const scene of pkg.scenes) {
    if (!scenes[scene.id]) {
      scenes[scene.id] = {
        visualPrompt: scene.visualPrompt,
        narration: scene.narration,
        onScreenText: scene.onScreenText,
        motionPrompt: scene.motionPrompt,
        assetType: scene.assetType ?? "image",
      };
    }
  }
  return { ...baseline, scenes };
}

/**
 * Increase scene count to `count`, preserving existing stable IDs.
 * Decreasing via setCount is rejected (no archive schema).
 */
export function increaseShortSceneCount(
  pkg: YouTubeShortFormatPackage,
  count: number
):
  | { ok: true; package: YouTubeShortFormatPackage; addedSceneIds: string[] }
  | { ok: false; error: string } {
  if (
    !Number.isInteger(count) ||
    count < YOUTUBE_SHORT_SCENE_COUNT_MIN ||
    count > YOUTUBE_SHORT_SCENE_COUNT_MAX
  ) {
    return {
      ok: false,
      error: `scene count must be an integer between ${YOUTUBE_SHORT_SCENE_COUNT_MIN} and ${YOUTUBE_SHORT_SCENE_COUNT_MAX}`,
    };
  }
  if (count < pkg.scenes.length) {
    return {
      ok: false,
      error:
        "Decreasing scene count via Apply is not supported without a recoverable archive. Remove one scene at a time with confirmation.",
    };
  }
  if (count === pkg.scenes.length) {
    return { ok: true, package: pkg, addedSceneIds: [] };
  }

  const baseline = ensureBaseline(pkg);
  const scenes = [...pkg.scenes];
  const addedSceneIds: string[] = [];
  while (scenes.length < count) {
    const scene = createEmptySceneCard(scenes.length);
    scenes.push(scene);
    addedSceneIds.push(scene.id);
    baseline.scenes[scene.id] = emptyBaseline();
  }

  return {
    ok: true,
    package: {
      ...withUpdatedDuration(pkg, renumberScenes(scenes)),
      generatedBaseline: baseline,
    },
    addedSceneIds,
  };
}

export function addShortScene(
  pkg: YouTubeShortFormatPackage
):
  | { ok: true; package: YouTubeShortFormatPackage; addedSceneId: string }
  | { ok: false; error: string } {
  if (pkg.scenes.length >= YOUTUBE_SHORT_SCENE_COUNT_MAX) {
    return {
      ok: false,
      error: `Cannot exceed ${YOUTUBE_SHORT_SCENE_COUNT_MAX} scenes`,
    };
  }
  const increased = increaseShortSceneCount(pkg, pkg.scenes.length + 1);
  if (!increased.ok) return increased;
  const addedSceneId = increased.addedSceneIds[0];
  if (!addedSceneId) {
    return { ok: false, error: "Failed to add scene" };
  }
  return {
    ok: true,
    package: increased.package,
    addedSceneId,
  };
}

/**
 * Remove one scene by stable id. Minimum product scene count remains.
 * Destructive — caller must confirm. No archive store.
 */
export function removeShortScene(
  pkg: YouTubeShortFormatPackage,
  sceneId: string
):
  | { ok: true; package: YouTubeShortFormatPackage }
  | { ok: false; error: string } {
  if (!pkg.scenes.some((s) => s.id === sceneId)) {
    return { ok: false, error: `Unknown scene id: ${sceneId}` };
  }
  if (pkg.scenes.length <= YOUTUBE_SHORT_SCENE_COUNT_MIN) {
    return {
      ok: false,
      error: `At least ${YOUTUBE_SHORT_SCENE_COUNT_MIN} scenes must remain`,
    };
  }

  const scenes = renumberScenes(pkg.scenes.filter((s) => s.id !== sceneId));
  const baseline = ensureBaseline(pkg);
  const nextBaselineScenes = { ...baseline.scenes };
  delete nextBaselineScenes[sceneId];

  let durableEdits = pkg.durableEdits ? { ...pkg.durableEdits } : undefined;
  if (durableEdits?.scenes) {
    const nextScenes = { ...durableEdits.scenes };
    delete nextScenes[sceneId];
    if (Object.keys(nextScenes).length > 0) {
      durableEdits = { ...durableEdits, scenes: nextScenes };
    } else {
      const { scenes: _drop, ...rest } = durableEdits;
      durableEdits =
        Object.keys(rest).length > 0
          ? (rest as typeof durableEdits)
          : undefined;
    }
  }

  return {
    ok: true,
    package: {
      ...withUpdatedDuration(pkg, scenes),
      generatedBaseline: { ...baseline, scenes: nextBaselineScenes },
      durableEdits,
    },
  };
}

export function applyShortSceneStructureAction(
  pkg: YouTubeShortFormatPackage,
  action: YouTubeShortSceneStructureAction
):
  | {
      ok: true;
      package: YouTubeShortFormatPackage;
      selectedSceneIdHint?: string;
    }
  | { ok: false; error: string } {
  if (action.setCount !== undefined) {
    const result = increaseShortSceneCount(pkg, action.setCount);
    if (!result.ok) return result;
    return {
      ok: true,
      package: result.package,
      selectedSceneIdHint: result.addedSceneIds[0],
    };
  }
  if (action.addScene) {
    const result = addShortScene(pkg);
    if (!result.ok) return result;
    return {
      ok: true,
      package: result.package,
      selectedSceneIdHint: result.addedSceneId,
    };
  }
  if (action.removeSceneId) {
    const removedIndex = pkg.scenes.findIndex(
      (s) => s.id === action.removeSceneId
    );
    const result = removeShortScene(pkg, action.removeSceneId);
    if (!result.ok) return result;
    // Prefer the scene that slid into the removed index; else the prior neighbor.
    const remaining = result.package.scenes;
    const nearest =
      remaining[Math.min(Math.max(removedIndex, 0), remaining.length - 1)] ??
      remaining[remaining.length - 1];
    return {
      ok: true,
      package: result.package,
      selectedSceneIdHint: nearest?.id,
    };
  }
  return { ok: false, error: "Invalid sceneStructure action" };
}
