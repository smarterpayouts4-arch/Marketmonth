import { useMemo } from "react";

import { useDerivedEditState } from "./use-derived-edit-state";
import { useSaveResetActions } from "./use-save-reset-actions";
import { useSceneImageRender } from "./use-scene-image-render";
import { useSceneIngestActions } from "./use-scene-ingest-actions";
import { useSceneStructureActions } from "./use-scene-structure-actions";
import { useAssembleFinalShort } from "./use-assemble-final-short";
import { useSceneComposedVideoRender } from "./use-scene-composed-video-render";
import { useSceneFullGenerate } from "./use-scene-full-generate";
import { useSceneVideoRender } from "./use-scene-video-render";
import { useSceneVoiceRender } from "./use-scene-voice-render";
import type { StudioEditActionsDeps } from "./types";

/**
 * Format selection, derived edits, save/reset/scene structure.
 * Called only from useAtomContentStudio (owns no React state).
 */
export function useStudioEditActions({
  atomState,
  packages,
  formatId,
  setFormatIdState,
  selectedSceneId,
  setSelectedSceneId,
  editsByFormat,
  setEditsByFormat,
  sceneEditsById,
  setSceneEditsById,
  promptMode,
  setPromptModeState,
  setSaveLabel,
  setIngestBusy,
  setIngestError,
  setRenderBusy,
  renderBusyMap,
  setRenderMessage,
  setRenderError,
  applyReadyBundle,
}: StudioEditActionsDeps) {
  const {
    activePackage,
    setFormatId,
    edits,
    selectedSceneEdits,
    dirty,
    setPromptMode,
    setEditField,
    setSceneEditField,
  } = useDerivedEditState({
    packages,
    formatId,
    setFormatIdState,
    selectedSceneId,
    setSelectedSceneId,
    editsByFormat,
    setEditsByFormat,
    sceneEditsById,
    setSceneEditsById,
    promptMode,
    setPromptModeState,
    setSaveLabel,
  });

  const { saveEdits, resetEdits } = useSaveResetActions({
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
  });

  const {
    ingestScenePrompt,
    startFromGeneratedScene,
  } = useSceneIngestActions({
    atomState,
    formatId,
    promptMode,
    selectedSceneId,
    activePackage,
    setSceneEditsById,
    setSaveLabel,
    setIngestBusy,
    setIngestError,
  });

  const { validateImageRender } = useSceneImageRender({
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
  });

  const { generateSceneVoice, clearSceneVoice } = useSceneVoiceRender({
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
  });

  const hasDurableStill = useMemo(() => {
    const scene = activePackage?.scenes.find((s) => s.id === selectedSceneId);
    return Boolean(
      scene && "render" in scene && scene.render?.assetUrl
    );
  }, [activePackage, selectedSceneId]);

  const hasDurableVoice = useMemo(() => {
    const scene = activePackage?.scenes.find((s) => s.id === selectedSceneId);
    return Boolean(
      scene &&
        "voice" in scene &&
        scene.voice?.assetUrl &&
        scene.voice.durationSeconds != null &&
        scene.voice.durationSeconds > 0
    );
  }, [activePackage, selectedSceneId]);

  const { generateSceneVideo, clearSceneVideo } = useSceneVideoRender({
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
  });

  const { composeSceneMp4 } = useSceneComposedVideoRender({
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
  });

  const { generateCompleteScene, fullGenerateProgress } = useSceneFullGenerate({
    atomState,
    formatId,
    promptMode,
    selectedSceneId,
    dirty,
    selectedSceneEdits,
    activePackage,
    edits,
    sceneEditsById,
    setPromptModeState,
    setRenderBusy,
    renderBusyMap,
    setRenderMessage,
    setRenderError,
    setSaveLabel,
    applyReadyBundle,
  });

  const { assembleFinalShort } = useAssembleFinalShort({
    atomState,
    formatId,
    promptMode,
    setPromptModeState,
    setRenderBusy,
    setRenderMessage,
    setRenderError,
    applyReadyBundle,
  });

  const {
    resetSelectedScene,
    applySceneCount,
    addScene,
    removeSelectedScene,
  } = useSceneStructureActions({
    atomState,
    selectedSceneId,
    applyReadyBundle,
    setSaveLabel,
    setPromptModeState,
    formatId,
  });

  return {
    activePackage,
    setFormatId,
    edits,
    selectedSceneEdits,
    dirty,
    setPromptMode,
    setEditField,
    setSceneEditField,
    saveEdits,
    resetEdits,
    resetSelectedScene,
    applySceneCount,
    addScene,
    removeSelectedScene,
    ingestScenePrompt,
    startFromGeneratedScene,
    validateImageRender,
    generateSceneVoice,
    clearSceneVoice,
    generateSceneVideo,
    clearSceneVideo,
    composeSceneMp4,
    generateCompleteScene,
    fullGenerateProgress,
    assembleFinalShort,
  };
}
