import { useCallback } from "react";

import {
  clearSavedSceneVoiceRequest,
  renderSavedSceneVoiceRequest,
} from "../studio-production-api";
import type { SceneEditFields, StudioPromptMode } from "../types";

import type { StudioEditActionsDeps } from "./types";

type SceneVoiceRenderDeps = Pick<
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

export function useSceneVoiceRender({
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
}: SceneVoiceRenderDeps) {
  const generateSceneVoice = useCallback(async (): Promise<boolean> => {
    if (atomState.status !== "ready") return false;
    if (formatId !== "youtube_short" || promptMode !== "manual") return false;
    if (!selectedSceneId) return false;
    if (dirty) {
      setRenderError("Save this scene before generating voice.");
      setRenderMessage(null);
      return false;
    }
    if (!selectedSceneEdits.narration.trim()) {
      setRenderError("Add narration first");
      setRenderMessage(null);
      return false;
    }

    setRenderBusy("voice", true);
    setRenderError(null);
    setRenderMessage(null);
    try {
      const result = await renderSavedSceneVoiceRequest({
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
      setRenderError("Network error generating scene voice");
      return false;
    } finally {
      setRenderBusy("voice", false);
    }
  }, [
    applyReadyBundle,
    atomState,
    dirty,
    formatId,
    promptMode,
    selectedSceneEdits.narration,
    selectedSceneId,
    setPromptModeState,
    setRenderBusy,
    setRenderError,
    setRenderMessage,
  ]);

  const clearSceneVoice = useCallback(async (): Promise<boolean> => {
    if (atomState.status !== "ready") return false;
    if (formatId !== "youtube_short" || promptMode !== "manual") return false;
    if (!selectedSceneId) return false;

    setRenderBusy("voice", true);
    setRenderError(null);
    setRenderMessage(null);
    try {
      const result = await clearSavedSceneVoiceRequest({
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
      setRenderError("Network error clearing scene voice");
      return false;
    } finally {
      setRenderBusy("voice", false);
    }
  }, [
    applyReadyBundle,
    atomState,
    formatId,
    promptMode,
    selectedSceneId,
    setPromptModeState,
    setRenderBusy,
    setRenderError,
    setRenderMessage,
  ]);

  return { generateSceneVoice, clearSceneVoice };
}
