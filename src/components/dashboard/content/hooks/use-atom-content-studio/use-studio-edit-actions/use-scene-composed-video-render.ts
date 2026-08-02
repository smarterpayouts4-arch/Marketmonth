import { useCallback } from "react";

import { renderSavedSceneComposedVideoRequest } from "../studio-production-api";
import type { SceneEditFields, StudioPromptMode } from "../types";

import type { StudioEditActionsDeps } from "./types";

type SceneComposedVideoRenderDeps = Pick<
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
  hasDurableStill: boolean;
  hasDurableVoice: boolean;
};

export function useSceneComposedVideoRender({
  atomState,
  formatId,
  promptMode,
  selectedSceneId,
  dirty,
  selectedSceneEdits,
  hasDurableStill,
  hasDurableVoice,
  setPromptModeState,
  setRenderBusy,
  setRenderMessage,
  setRenderError,
  applyReadyBundle,
}: SceneComposedVideoRenderDeps) {
  const composeSceneMp4 = useCallback(async (): Promise<boolean> => {
    if (atomState.status !== "ready") return false;
    if (formatId !== "youtube_short" || promptMode !== "manual") return false;
    if (!selectedSceneId) return false;
    if (dirty) {
      setRenderError("Save this scene before composing the MP4.");
      setRenderMessage(null);
      return false;
    }
    if (!hasDurableStill) {
      setRenderError("Generate a scene image first — composition needs a saved still");
      setRenderMessage(null);
      return false;
    }
    if (!hasDurableVoice) {
      setRenderError(
        "Generate scene voice with a verified duration before composing the MP4"
      );
      setRenderMessage(null);
      return false;
    }
    if (!selectedSceneEdits.narration.trim()) {
      setRenderError("Add narration first");
      setRenderMessage(null);
      return false;
    }

    setRenderBusy("compose", true);
    setRenderError(null);
    setRenderMessage(null);
    try {
      const result = await renderSavedSceneComposedVideoRequest({
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
      const durationNote = result.durationVerified
        ? ""
        : " · duration Unverified";
      setRenderMessage(`${result.message}${durationNote}`);
      return true;
    } catch {
      setRenderError("Network error composing scene MP4");
      return false;
    } finally {
      setRenderBusy("compose", false);
    }
  }, [
    applyReadyBundle,
    atomState,
    dirty,
    formatId,
    hasDurableStill,
    hasDurableVoice,
    promptMode,
    selectedSceneEdits.narration,
    selectedSceneId,
    setPromptModeState,
    setRenderBusy,
    setRenderError,
    setRenderMessage,
  ]);

  return { composeSceneMp4 };
}
