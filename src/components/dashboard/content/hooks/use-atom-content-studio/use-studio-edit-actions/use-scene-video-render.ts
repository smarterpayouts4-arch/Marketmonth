import { useCallback } from "react";

import {
  clearSavedSceneVideoRequest,
  renderSavedSceneVideoRequest,
} from "../studio-production-api";
import type { SceneEditFields, StudioPromptMode } from "../types";

import type { StudioEditActionsDeps } from "./types";

type SceneVideoRenderDeps = Pick<
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
  /** Durable still URL from selected package scene (not draft-only). */
  hasDurableStill: boolean;
};

export function useSceneVideoRender({
  atomState,
  formatId,
  promptMode,
  selectedSceneId,
  dirty,
  selectedSceneEdits,
  hasDurableStill,
  setPromptModeState,
  setRenderBusy,
  setRenderMessage,
  setRenderError,
  applyReadyBundle,
}: SceneVideoRenderDeps) {
  const generateSceneVideo = useCallback(async (): Promise<boolean> => {
    if (atomState.status !== "ready") return false;
    if (formatId !== "youtube_short" || promptMode !== "manual") return false;
    if (!selectedSceneId) return false;
    if (dirty) {
      setRenderError("Save this scene before generating video.");
      setRenderMessage(null);
      return false;
    }
    if (!(selectedSceneEdits.motionPrompt ?? "").trim()) {
      setRenderError(
        "Add and save Motion Prompt instructions before generating video."
      );
      setRenderMessage(null);
      return false;
    }
    if (!hasDurableStill) {
      setRenderError("Generate a scene image first — video needs a saved still");
      setRenderMessage(null);
      return false;
    }

    setRenderBusy("video", true);
    setRenderError(null);
    setRenderMessage(null);
    try {
      const result = await renderSavedSceneVideoRequest({
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
      setRenderError("Network error generating scene video");
      return false;
    } finally {
      setRenderBusy("video", false);
    }
  }, [
    applyReadyBundle,
    atomState,
    dirty,
    formatId,
    hasDurableStill,
    promptMode,
    selectedSceneEdits.motionPrompt,
    selectedSceneId,
    setPromptModeState,
    setRenderBusy,
    setRenderError,
    setRenderMessage,
  ]);

  const clearSceneVideo = useCallback(async (): Promise<boolean> => {
    if (atomState.status !== "ready") return false;
    if (formatId !== "youtube_short" || promptMode !== "manual") return false;
    if (!selectedSceneId) return false;

    setRenderBusy("video", true);
    setRenderError(null);
    setRenderMessage(null);
    try {
      const result = await clearSavedSceneVideoRequest({
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
      setRenderError("Network error clearing scene video");
      return false;
    } finally {
      setRenderBusy("video", false);
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

  return { generateSceneVideo, clearSceneVideo };
}
