import { useCallback } from "react";

import type { ContentFormatId } from "@/brain/content-studio";

import {
  addSceneAction,
  applySceneCountAction,
  removeSelectedSceneAction,
  resetSelectedSceneAction,
} from "../studio-scene-actions";

import type { StudioEditActionsDeps } from "./types";

type SceneStructureDeps = Pick<
  StudioEditActionsDeps,
  | "atomState"
  | "selectedSceneId"
  | "applyReadyBundle"
  | "setSaveLabel"
  | "setPromptModeState"
> & {
  formatId: ContentFormatId;
};

export function useSceneStructureActions({
  atomState,
  selectedSceneId,
  applyReadyBundle,
  setSaveLabel,
  setPromptModeState,
  formatId,
}: SceneStructureDeps) {
  const resetSelectedScene = useCallback(
    () =>
      resetSelectedSceneAction(
        {
          atomState,
          selectedSceneId,
          applyReadyBundle,
          setSaveLabel,
          setPromptModeState,
        },
        formatId
      ),
    [
      applyReadyBundle,
      atomState,
      formatId,
      selectedSceneId,
      setPromptModeState,
      setSaveLabel,
    ]
  );

  const applySceneCount = useCallback(
    (count: number) =>
      applySceneCountAction(
        {
          atomState,
          selectedSceneId,
          applyReadyBundle,
          setSaveLabel,
          setPromptModeState,
        },
        count
      ),
    [
      applyReadyBundle,
      atomState,
      selectedSceneId,
      setPromptModeState,
      setSaveLabel,
    ]
  );

  const addScene = useCallback(
    () =>
      addSceneAction({
        atomState,
        selectedSceneId,
        applyReadyBundle,
        setSaveLabel,
        setPromptModeState,
      }),
    [
      applyReadyBundle,
      atomState,
      selectedSceneId,
      setPromptModeState,
      setSaveLabel,
    ]
  );

  const removeSelectedScene = useCallback(
    () =>
      removeSelectedSceneAction({
        atomState,
        selectedSceneId,
        applyReadyBundle,
        setSaveLabel,
        setPromptModeState,
      }),
    [
      applyReadyBundle,
      atomState,
      selectedSceneId,
      setPromptModeState,
      setSaveLabel,
    ]
  );

  return {
    resetSelectedScene,
    applySceneCount,
    addScene,
    removeSelectedScene,
  };
}
