import { useCallback } from "react";

import type { ContentFormatPackage } from "@/brain/content-studio";

import {
  baselineSceneFields,
  isShortPackage,
  sceneFieldsFromScene,
} from "../package-edit-helpers";
import { ingestScenePromptRequest } from "../studio-production-api";
import {
  EMPTY_SCENE,
  type SceneEditFields,
  type StudioPromptMode,
} from "../types";

import type { StudioEditActionsDeps } from "./types";

type SceneIngestDeps = Pick<
  StudioEditActionsDeps,
  | "atomState"
  | "formatId"
  | "selectedSceneId"
  | "setSceneEditsById"
  | "setSaveLabel"
  | "setIngestBusy"
  | "setIngestError"
> & {
  promptMode: StudioPromptMode;
  activePackage: ContentFormatPackage | null;
};

export function useSceneIngestActions({
  atomState,
  formatId,
  promptMode,
  selectedSceneId,
  activePackage,
  setSceneEditsById,
  setSaveLabel,
  setIngestBusy,
  setIngestError,
}: SceneIngestDeps) {
  const applyExtractedToSelectedScene = useCallback(
    (extracted: SceneEditFields) => {
      if (!selectedSceneId) return;
      setSceneEditsById((prev) => {
        const prior = prev[selectedSceneId] ?? EMPTY_SCENE;
        const nextOst = extracted.onScreenText.trim()
          ? extracted.onScreenText
          : prior.onScreenText;
        const nextMotion = extracted.motionPrompt.trim()
          ? extracted.motionPrompt
          : prior.motionPrompt;
        return {
          ...prev,
          [selectedSceneId]: {
            visualPrompt: extracted.visualPrompt,
            narration: extracted.narration,
            onScreenText: nextOst,
            motionPrompt: nextMotion,
            assetType: extracted.assetType,
          },
        };
      });
      setSaveLabel("Unsaved changes");
      setIngestError(null);
    },
    [selectedSceneId, setIngestError, setSaveLabel, setSceneEditsById]
  );

  const startFromGeneratedScene = useCallback(() => {
    if (
      formatId !== "youtube_short" ||
      promptMode !== "manual" ||
      !selectedSceneId ||
      !activePackage ||
      !isShortPackage(activePackage)
    ) {
      return;
    }
    const fields = baselineSceneFields(activePackage, selectedSceneId);
    const scene = activePackage.scenes.find((s) => s.id === selectedSceneId);
    const current = scene ? sceneFieldsFromScene(scene) : EMPTY_SCENE;
    setSceneEditsById((prev) => ({
      ...prev,
      [selectedSceneId]: fields,
    }));
    const changed =
      fields.visualPrompt !== current.visualPrompt ||
      fields.narration !== current.narration ||
      fields.onScreenText !== current.onScreenText ||
      fields.motionPrompt !== current.motionPrompt ||
      fields.assetType !== current.assetType;
    setSaveLabel(changed ? "Unsaved changes" : "Save draft");
  }, [
    activePackage,
    formatId,
    promptMode,
    selectedSceneId,
    setSaveLabel,
    setSceneEditsById,
  ]);

  const ingestScenePrompt = useCallback(
    async (prompt: string): Promise<boolean> => {
      if (atomState.status !== "ready") return false;
      if (formatId !== "youtube_short" || promptMode !== "manual") return false;
      if (!selectedSceneId) return false;

      setIngestBusy(true);
      setIngestError(null);
      try {
        const result = await ingestScenePromptRequest({
          atomId: atomState.atom.atom_id,
          sceneId: selectedSceneId,
          prompt,
        });
        if (!result.ok) {
          setIngestError(result.error);
          return false;
        }
        applyExtractedToSelectedScene({
          visualPrompt: result.extracted.visualPrompt,
          narration: result.extracted.narration,
          onScreenText: result.extracted.onScreenText ?? "",
          motionPrompt: result.extracted.motionPrompt ?? "",
          assetType:
            result.extracted.assetType === "video" ? "video" : "image",
        });
        return true;
      } catch {
        setIngestError("Network error extracting scene fields");
        return false;
      } finally {
        setIngestBusy(false);
      }
    },
    [
      applyExtractedToSelectedScene,
      atomState,
      formatId,
      promptMode,
      selectedSceneId,
      setIngestBusy,
      setIngestError,
    ]
  );

  return {
    ingestScenePrompt,
    startFromGeneratedScene,
    applyExtractedToSelectedScene,
  };
}
