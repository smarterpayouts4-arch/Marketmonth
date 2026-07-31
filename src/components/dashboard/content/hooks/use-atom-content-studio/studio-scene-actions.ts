import type { ContentProductionBundle } from "@/brain/content-studio";

import { patchShortDurableEdits } from "./studio-production-api";
import type { AtomLoadState, StudioPromptMode } from "./types";

type SceneActionDeps = {
  atomState: AtomLoadState;
  selectedSceneId: string | null;
  applyReadyBundle: (
    bundle: ContentProductionBundle,
    preferredSceneId?: string | null
  ) => void;
  setSaveLabel: (label: string) => void;
  setPromptModeState: (mode: StudioPromptMode) => void;
};

export async function resetSelectedSceneAction(
  deps: SceneActionDeps,
  formatId: string
): Promise<void> {
  const { atomState, selectedSceneId, applyReadyBundle, setSaveLabel } = deps;
  if (atomState.status !== "ready" || !selectedSceneId) return;
  if (formatId !== "youtube_short") return;
  setSaveLabel("Resetting scene…");
  try {
    const result = await patchShortDurableEdits({
      atomId: atomState.atom.atom_id,
      resetSceneId: selectedSceneId,
    });
    if (!result.ok) {
      setSaveLabel(result.error);
      return;
    }
    applyReadyBundle(result.bundle, selectedSceneId);
    setSaveLabel("Save draft");
  } catch {
    setSaveLabel("Reset scene failed");
  }
}

export async function applySceneCountAction(
  deps: SceneActionDeps,
  count: number
): Promise<void> {
  const {
    atomState,
    applyReadyBundle,
    setSaveLabel,
    setPromptModeState,
  } = deps;
  if (atomState.status !== "ready") return;
  setSaveLabel("Updating scenes…");
  try {
    const result = await patchShortDurableEdits({
      atomId: atomState.atom.atom_id,
      sceneStructure: { setCount: count },
    });
    if (!result.ok) {
      setSaveLabel(result.error);
      return;
    }
    applyReadyBundle(result.bundle, result.selectedSceneIdHint);
    setPromptModeState("manual");
    setSaveLabel("Save draft");
  } catch {
    setSaveLabel("Scene update failed");
  }
}

export async function addSceneAction(deps: SceneActionDeps): Promise<void> {
  const {
    atomState,
    applyReadyBundle,
    setSaveLabel,
    setPromptModeState,
  } = deps;
  if (atomState.status !== "ready") return;
  setSaveLabel("Adding scene…");
  try {
    const result = await patchShortDurableEdits({
      atomId: atomState.atom.atom_id,
      sceneStructure: { addScene: true },
    });
    if (!result.ok) {
      setSaveLabel(result.error);
      return;
    }
    applyReadyBundle(result.bundle, result.selectedSceneIdHint);
    setPromptModeState("manual");
    setSaveLabel("Save draft");
  } catch {
    setSaveLabel("Add scene failed");
  }
}

export async function removeSelectedSceneAction(
  deps: SceneActionDeps
): Promise<void> {
  const {
    atomState,
    selectedSceneId,
    applyReadyBundle,
    setSaveLabel,
    setPromptModeState,
  } = deps;
  if (atomState.status !== "ready" || !selectedSceneId) return;
  setSaveLabel("Removing scene…");
  try {
    const result = await patchShortDurableEdits({
      atomId: atomState.atom.atom_id,
      sceneStructure: { removeSceneId: selectedSceneId },
    });
    if (!result.ok) {
      setSaveLabel(result.error);
      return;
    }
    applyReadyBundle(result.bundle, result.selectedSceneIdHint);
    setPromptModeState("manual");
    setSaveLabel("Save draft");
  } catch {
    setSaveLabel("Remove scene failed");
  }
}
