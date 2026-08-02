import { useCallback } from "react";

import type { ContentFormatPackage } from "@/brain/content-studio";

import {
  buildScenePatches,
  editsFromPackage,
  isShortPackage,
  resolveGlobalVisualStyle,
} from "../package-edit-helpers";
import { patchShortDurableEdits } from "../studio-production-api";
import type { FormatEdits } from "../types";

import type { StudioEditActionsDeps } from "./types";

type SaveResetDeps = Pick<
  StudioEditActionsDeps,
  | "atomState"
  | "formatId"
  | "setEditsByFormat"
  | "sceneEditsById"
  | "promptMode"
  | "setPromptModeState"
  | "setSaveLabel"
  | "applyReadyBundle"
> & {
  activePackage: ContentFormatPackage | null;
  edits: FormatEdits;
};

export function useSaveResetActions({
  atomState,
  formatId,
  activePackage,
  edits,
  setEditsByFormat,
  sceneEditsById,
  promptMode,
  setPromptModeState,
  setSaveLabel,
  applyReadyBundle,
}: SaveResetDeps) {
  const saveEdits = useCallback(async () => {
    if (atomState.status !== "ready") return;
    if (formatId !== "youtube_short") {
      setSaveLabel("Video edits not persisted yet");
      return;
    }
    if (promptMode !== "manual") {
      setSaveLabel("Switch to Manual to edit");
      return;
    }
    if (!activePackage || !isShortPackage(activePackage)) return;

    const scenePatches = buildScenePatches(activePackage, sceneEditsById);
    const styleBase = resolveGlobalVisualStyle(activePackage);
    const styleChanged = edits.globalVisualStyle !== styleBase;
    const hasScenes = Object.keys(scenePatches).length > 0;
    if (!hasScenes && !styleChanged) {
      setSaveLabel("Save draft");
      return;
    }

    setSaveLabel("Saving…");
    try {
      const result = await patchShortDurableEdits({
        atomId: atomState.atom.atom_id,
        edits: {
          ...(hasScenes ? { scenes: scenePatches } : {}),
          ...(styleChanged
            ? { globalVisualStyle: edits.globalVisualStyle }
            : {}),
        },
      });
      if (!result.ok) {
        setSaveLabel(result.error);
        return;
      }
      applyReadyBundle(result.bundle);
      setPromptModeState("manual");
      setSaveLabel("Saved");
    } catch {
      setSaveLabel("Save failed");
    }
  }, [
    activePackage,
    applyReadyBundle,
    atomState,
    edits.globalVisualStyle,
    formatId,
    promptMode,
    sceneEditsById,
    setPromptModeState,
    setSaveLabel,
  ]);

  const resetEdits = useCallback(async () => {
    if (atomState.status !== "ready" || !activePackage) return;
    if (formatId !== "youtube_short") {
      setEditsByFormat((prev) => ({
        ...prev,
        [formatId]: editsFromPackage(activePackage),
      }));
      setSaveLabel("Save draft");
      return;
    }
    setSaveLabel("Resetting…");
    try {
      const result = await patchShortDurableEdits({
        atomId: atomState.atom.atom_id,
        resetToGenerated: true,
      });
      if (!result.ok) {
        setSaveLabel(result.error);
        return;
      }
      applyReadyBundle(result.bundle);
      setPromptModeState("generated");
      setSaveLabel("Save draft");
    } catch {
      setSaveLabel("Reset failed");
    }
  }, [
    activePackage,
    applyReadyBundle,
    atomState,
    formatId,
    setEditsByFormat,
    setPromptModeState,
    setSaveLabel,
  ]);

  return { saveEdits, resetEdits };
}
