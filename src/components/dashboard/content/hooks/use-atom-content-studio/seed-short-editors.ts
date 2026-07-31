import type {
  ContentFormatId,
  YouTubeShortFormatPackage,
} from "@/brain/content-studio";

import {
  editsFromPackage,
  sceneEditsFromPackage,
  shortHasDurableEdits,
} from "./package-edit-helpers";
import type {
  FormatEdits,
  SceneEditFields,
  StudioPromptMode,
} from "./types";
import type {
  FetchAtomResult,
  FetchBundleResult,
} from "./studio-production-api";

export type AtomFetchRecord = {
  forAtomId: string;
  requestId: number;
  result: FetchAtomResult;
};

export type BundleFetchRecord = {
  forAtomId: string;
  requestId: number;
  result: FetchBundleResult;
};

export function seedShortEditors(
  pkg: YouTubeShortFormatPackage,
  setEditsByFormat: (
    updater: (
      prev: Partial<Record<ContentFormatId, FormatEdits>>
    ) => Partial<Record<ContentFormatId, FormatEdits>>
  ) => void,
  setSceneEditsById: (value: Record<string, SceneEditFields>) => void,
  setPromptModeState: (mode: StudioPromptMode) => void,
  setSelectedSceneId: (
    updater: (prev: string | null) => string | null
  ) => void,
  preferredSceneId?: string | null
) {
  setEditsByFormat((prev) => ({
    ...prev,
    youtube_short: editsFromPackage(pkg),
  }));
  setSceneEditsById(sceneEditsFromPackage(pkg));
  setPromptModeState(shortHasDurableEdits(pkg) ? "manual" : "generated");
  setSelectedSceneId((prev) => {
    if (preferredSceneId && pkg.scenes.some((s) => s.id === preferredSceneId)) {
      return preferredSceneId;
    }
    if (prev && pkg.scenes.some((s) => s.id === prev)) return prev;
    return pkg.scenes[0]?.id ?? null;
  });
}
