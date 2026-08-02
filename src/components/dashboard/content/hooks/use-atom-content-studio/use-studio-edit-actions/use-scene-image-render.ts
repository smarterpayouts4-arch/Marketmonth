import { useCallback } from "react";

import { renderSavedSceneImageRequest } from "../studio-production-api";
import type { SceneEditFields, StudioPromptMode } from "../types";

import type { StudioEditActionsDeps } from "./types";

type SceneImageRenderDeps = Pick<
  StudioEditActionsDeps,
  | "atomState"
  | "formatId"
  | "selectedSceneId"
  | "setPromptModeState"
  | "setRenderBusy"
  | "setRenderMessage"
  | "setRenderError"
  | "applyReadyBundle"
> & {
  promptMode: StudioPromptMode;
  dirty: boolean;
  selectedSceneEdits: SceneEditFields;
};

export function useSceneImageRender({
  atomState,
  formatId,
  promptMode,
  selectedSceneId,
  dirty,
  selectedSceneEdits,
  setPromptModeState,
  setRenderBusy,
  setRenderMessage,
  setRenderError,
  applyReadyBundle,
}: SceneImageRenderDeps) {
  const validateImageRender = useCallback(async (): Promise<boolean> => {
    if (atomState.status !== "ready") return false;
    if (formatId !== "youtube_short" || promptMode !== "manual") return false;
    if (!selectedSceneId) return false;
    if (dirty) {
      setRenderError("Save this scene before generating its image.");
      setRenderMessage(null);
      return false;
    }
    if (!selectedSceneEdits.visualPrompt.trim()) {
      setRenderError("Add a visual prompt first");
      setRenderMessage(null);
      return false;
    }

    setRenderBusy("image", true);
    setRenderError(null);
    setRenderMessage(null);
    try {
      const result = await renderSavedSceneImageRequest({
        atomId: atomState.atom.atom_id,
        sceneId: selectedSceneId,
      });
      if (!result.ok) {
        if (result.bundle) {
          applyReadyBundle(result.bundle);
          setPromptModeState("manual");
        }
        setRenderError(result.error);
        return false;
      }
      applyReadyBundle(result.bundle);
      setPromptModeState("manual");
      setRenderMessage(result.message);
      return true;
    } catch {
      setRenderError("Network error preparing scene render");
      return false;
    } finally {
      setRenderBusy("image", false);
    }
  }, [
    applyReadyBundle,
    atomState,
    dirty,
    formatId,
    promptMode,
    selectedSceneEdits.visualPrompt,
    selectedSceneId,
    setPromptModeState,
    setRenderBusy,
    setRenderError,
    setRenderMessage,
  ]);

  return { validateImageRender };
}
