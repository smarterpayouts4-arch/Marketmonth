"use client";

import { useCallback, useMemo, useState } from "react";

import type { ContentFormatId, PlatformId } from "@/brain/content-studio";

import {
  isAnyRenderBusy,
  type RenderBusyMap,
  type RenderOp,
} from "./render-busy";
import type { FormatEdits, SceneEditFields, StudioPromptMode } from "./types";
import { useStudioBundle } from "./use-studio-bundle";
import { useStudioEditActions } from "./use-studio-edit-actions";

export function useAtomContentStudio(atomId: string | null) {
  const trimmedAtomId = atomId?.trim() || null;

  const [platform, setPlatform] = useState<PlatformId>("youtube");
  const [formatId, setFormatIdState] = useState<ContentFormatId>("youtube_short");
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [editsByFormat, setEditsByFormat] = useState<
    Partial<Record<ContentFormatId, FormatEdits>>
  >({});
  const [sceneEditsById, setSceneEditsById] = useState<
    Record<string, SceneEditFields>
  >({});
  const [promptMode, setPromptModeState] =
    useState<StudioPromptMode>("generated");
  const [saveLabel, setSaveLabel] = useState("Save draft");
  const [ingestBusy, setIngestBusy] = useState(false);
  const [ingestError, setIngestError] = useState<string | null>(null);
  const [renderBusyMap, setRenderBusyMap] = useState<RenderBusyMap>({});
  const [renderMessage, setRenderMessage] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  const setRenderBusy = useCallback((op: RenderOp, busy: boolean) => {
    setRenderBusyMap((prev) => {
      if (busy) return { ...prev, [op]: true };
      const next = { ...prev };
      delete next[op];
      return next;
    });
  }, []);

  const renderBusy = isAnyRenderBusy(renderBusyMap);

  const { atomState, bundleState, applyReadyBundle, regenerate, reloadAtom } =
    useStudioBundle({
      trimmedAtomId,
      setEditsByFormat,
      setSceneEditsById,
      setPromptModeState,
      setSelectedSceneId,
    });

  const packages = useMemo(
    () =>
      bundleState.status === "ready" ? bundleState.bundle.packages : [],
    [bundleState]
  );

  const {
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
  } = useStudioEditActions({
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
  });

  const regenerateFormats = useCallback(
    (formatIds?: ContentFormatId[]) => {
      regenerate(formatId, formatIds);
    },
    [formatId, regenerate]
  );

  return {
    atomState,
    bundleState,
    platform,
    setPlatform,
    formatId,
    setFormatId,
    packages,
    activePackage,
    selectedSceneId,
    setSelectedSceneId,
    promptMode,
    setPromptMode,
    edits,
    setEditField,
    selectedSceneEdits,
    setSceneEditField,
    dirty,
    saveLabel,
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
    ingestBusy,
    ingestError,
    renderBusy,
    renderBusyMap,
    renderMessage,
    renderError,
    regenerate: regenerateFormats,
    reloadAtom,
  };
}
