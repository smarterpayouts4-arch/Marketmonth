import { useCallback } from "react";

import { assembleFinalShortRequest } from "../studio-production-api";
import type { StudioPromptMode } from "../types";

import type { StudioEditActionsDeps } from "./types";

type AssembleDeps = Pick<
  StudioEditActionsDeps,
  | "atomState"
  | "formatId"
  | "setPromptModeState"
  | "setRenderBusy"
  | "setRenderMessage"
  | "setRenderError"
  | "applyReadyBundle"
> & {
  promptMode: StudioPromptMode;
};

export function useAssembleFinalShort({
  atomState,
  formatId,
  promptMode,
  setPromptModeState,
  setRenderBusy,
  setRenderMessage,
  setRenderError,
  applyReadyBundle,
}: AssembleDeps) {
  const assembleFinalShort = useCallback(async (): Promise<boolean> => {
    if (atomState.status !== "ready") return false;
    if (formatId !== "youtube_short" || promptMode !== "manual") return false;

    setRenderBusy("assemble", true);
    setRenderError(null);
    setRenderMessage(null);
    try {
      const result = await assembleFinalShortRequest({
        atomId: atomState.atom.atom_id,
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
      setRenderError("Network error assembling final Short");
      return false;
    } finally {
      setRenderBusy("assemble", false);
    }
  }, [
    applyReadyBundle,
    atomState,
    formatId,
    promptMode,
    setPromptModeState,
    setRenderBusy,
    setRenderError,
    setRenderMessage,
  ]);

  return { assembleFinalShort };
}
