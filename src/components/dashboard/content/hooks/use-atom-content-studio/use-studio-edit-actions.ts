import { useCallback, useMemo } from "react";

import type {
  ContentFormatId,
  ContentFormatPackage,
  ContentProductionBundle,
} from "@/brain/content-studio";

import {
  baselineEditsFromPackage,
  baselineSceneFields,
  buildScenePatches,
  editsFromPackage,
  isShortPackage,
  resolveGlobalVisualStyle,
  sceneEditsFromPackage,
  sceneFieldsFromScene,
} from "./package-edit-helpers";
import {
  addSceneAction,
  applySceneCountAction,
  removeSelectedSceneAction,
  resetSelectedSceneAction,
} from "./studio-scene-actions";
import {
  ingestScenePromptRequest,
  patchShortDurableEdits,
  renderSavedSceneImageRequest,
} from "./studio-production-api";
import {
  EMPTY_EDITS,
  EMPTY_SCENE,
  type AtomLoadState,
  type FormatEdits,
  type SceneEditFields,
  type StudioPromptMode,
} from "./types";

type StudioEditActionsDeps = {
  atomState: AtomLoadState;
  packages: ContentFormatPackage[];
  formatId: ContentFormatId;
  setFormatIdState: (id: ContentFormatId) => void;
  selectedSceneId: string | null;
  setSelectedSceneId: (
    value: string | null | ((prev: string | null) => string | null)
  ) => void;
  editsByFormat: Partial<Record<ContentFormatId, FormatEdits>>;
  setEditsByFormat: (
    updater: (
      prev: Partial<Record<ContentFormatId, FormatEdits>>
    ) => Partial<Record<ContentFormatId, FormatEdits>>
  ) => void;
  sceneEditsById: Record<string, SceneEditFields>;
  setSceneEditsById: (
    value:
      | Record<string, SceneEditFields>
      | ((prev: Record<string, SceneEditFields>) => Record<string, SceneEditFields>)
  ) => void;
  promptMode: StudioPromptMode;
  setPromptModeState: (mode: StudioPromptMode) => void;
  setSaveLabel: (label: string) => void;
  setIngestBusy: (busy: boolean) => void;
  setIngestError: (error: string | null) => void;
  setRenderBusy: (busy: boolean) => void;
  setRenderMessage: (message: string | null) => void;
  setRenderError: (error: string | null) => void;
  applyReadyBundle: (
    bundle: ContentProductionBundle,
    preferredSceneId?: string | null
  ) => void;
};

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
  setRenderMessage,
  setRenderError,
  applyReadyBundle,
}: StudioEditActionsDeps) {
  const activePackage =
    packages.find((p) => p.formatId === formatId) ?? null;

  const setFormatId = useCallback(
    (next: ContentFormatId) => {
      setFormatIdState(next);
      const pkg = packages.find((p) => p.formatId === next);
      if (pkg) {
        setEditsByFormat((prev) =>
          prev[next] ? prev : { ...prev, [next]: editsFromPackage(pkg) }
        );
        setSelectedSceneId(pkg.scenes[0]?.id ?? null);
      }
    },
    [packages, setEditsByFormat, setFormatIdState, setSelectedSceneId]
  );

  const edits = useMemo(() => {
    if (
      formatId === "youtube_short" &&
      promptMode === "generated" &&
      activePackage
    ) {
      return baselineEditsFromPackage(activePackage);
    }
    return (
      editsByFormat[formatId] ??
      (activePackage ? editsFromPackage(activePackage) : EMPTY_EDITS)
    );
  }, [activePackage, editsByFormat, formatId, promptMode]);

  const selectedSceneEdits = useMemo((): SceneEditFields => {
    if (!selectedSceneId) return EMPTY_SCENE;
    if (
      formatId === "youtube_short" &&
      promptMode === "generated" &&
      activePackage &&
      isShortPackage(activePackage)
    ) {
      return baselineSceneFields(activePackage, selectedSceneId);
    }
    return sceneEditsById[selectedSceneId] ?? EMPTY_SCENE;
  }, [
    activePackage,
    formatId,
    promptMode,
    sceneEditsById,
    selectedSceneId,
  ]);

  const dirty = useMemo(() => {
    if (!activePackage) return false;
    if (formatId === "youtube_short" && promptMode !== "manual") return false;
    if (formatId === "youtube_short" && isShortPackage(activePackage)) {
      const sceneDirty =
        Object.keys(buildScenePatches(activePackage, sceneEditsById)).length >
        0;
      const styleDirty =
        edits.globalVisualStyle !== resolveGlobalVisualStyle(activePackage);
      return sceneDirty || styleDirty;
    }
    const base = editsFromPackage(activePackage);
    return (
      edits.imagePrompt !== base.imagePrompt ||
      edits.voiceoverPrompt !== base.voiceoverPrompt ||
      edits.script !== base.script
    );
  }, [activePackage, edits, formatId, promptMode, sceneEditsById]);

  const setPromptMode = useCallback(
    (mode: StudioPromptMode) => {
      if (formatId !== "youtube_short" || !activePackage) return;
      if (!isShortPackage(activePackage)) return;
      setEditsByFormat((prev) => ({
        ...prev,
        youtube_short: editsFromPackage(activePackage),
      }));
      setSceneEditsById(sceneEditsFromPackage(activePackage));
      if (mode === "generated") {
        setSaveLabel("Save draft");
      }
      setPromptModeState(mode);
    },
    [
      activePackage,
      formatId,
      setEditsByFormat,
      setPromptModeState,
      setSaveLabel,
      setSceneEditsById,
    ]
  );

  const setEditField = useCallback(
    (field: keyof FormatEdits, value: string) => {
      if (formatId === "youtube_short" && promptMode !== "manual") return;
      setEditsByFormat((prev) => ({
        ...prev,
        [formatId]: {
          ...(prev[formatId] ??
            (activePackage ? editsFromPackage(activePackage) : EMPTY_EDITS)),
          [field]: value,
        },
      }));
      setSaveLabel("Unsaved changes");
    },
    [activePackage, formatId, promptMode, setEditsByFormat, setSaveLabel]
  );

  const setSceneEditField = useCallback(
    <K extends keyof SceneEditFields>(field: K, value: SceneEditFields[K]) => {
      if (
        formatId !== "youtube_short" ||
        promptMode !== "manual" ||
        !selectedSceneId
      ) {
        return;
      }
      setSceneEditsById((prev) => ({
        ...prev,
        [selectedSceneId]: {
          ...(prev[selectedSceneId] ?? EMPTY_SCENE),
          [field]: value,
        },
      }));
      setSaveLabel("Unsaved changes");
    },
    [formatId, promptMode, selectedSceneId, setSaveLabel, setSceneEditsById]
  );

  const saveEdits = useCallback(async () => {
    if (atomState.status !== "ready") return;
    if (formatId !== "youtube_short") {
      setSaveLabel("Video edits not persisted yet");
      return;
    }
    if (promptMode !== "manual") {
      setSaveLabel("Switch to Manual to edit");
      return;
    }
    if (!activePackage || !isShortPackage(activePackage)) return;

    const scenePatches = buildScenePatches(activePackage, sceneEditsById);
    const styleBase = resolveGlobalVisualStyle(activePackage);
    const styleChanged = edits.globalVisualStyle !== styleBase;
    const hasScenes = Object.keys(scenePatches).length > 0;
    if (!hasScenes && !styleChanged) {
      setSaveLabel("Save draft");
      return;
    }

    setSaveLabel("Saving…");
    try {
      const result = await patchShortDurableEdits({
        atomId: atomState.atom.atom_id,
        edits: {
          ...(hasScenes ? { scenes: scenePatches } : {}),
          ...(styleChanged
            ? { globalVisualStyle: edits.globalVisualStyle }
            : {}),
        },
      });
      if (!result.ok) {
        setSaveLabel(result.error);
        return;
      }
      applyReadyBundle(result.bundle);
      setPromptModeState("manual");
      setSaveLabel("Saved");
    } catch {
      setSaveLabel("Save failed");
    }
  }, [
    activePackage,
    applyReadyBundle,
    atomState,
    edits.globalVisualStyle,
    formatId,
    promptMode,
    sceneEditsById,
    setPromptModeState,
    setSaveLabel,
  ]);

  const resetEdits = useCallback(async () => {
    if (atomState.status !== "ready" || !activePackage) return;
    if (formatId !== "youtube_short") {
      setEditsByFormat((prev) => ({
        ...prev,
        [formatId]: editsFromPackage(activePackage),
      }));
      setSaveLabel("Save draft");
      return;
    }
    setSaveLabel("Resetting…");
    try {
      const result = await patchShortDurableEdits({
        atomId: atomState.atom.atom_id,
        resetToGenerated: true,
      });
      if (!result.ok) {
        setSaveLabel(result.error);
        return;
      }
      applyReadyBundle(result.bundle);
      setPromptModeState("generated");
      setSaveLabel("Save draft");
    } catch {
      setSaveLabel("Reset failed");
    }
  }, [
    activePackage,
    applyReadyBundle,
    atomState,
    formatId,
    setEditsByFormat,
    setPromptModeState,
    setSaveLabel,
  ]);

  const applyExtractedToSelectedScene = useCallback(
    (extracted: SceneEditFields) => {
      if (!selectedSceneId) return;
      setSceneEditsById((prev) => ({
        ...prev,
        [selectedSceneId]: { ...extracted },
      }));
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

  const validateImageRender = useCallback(async (): Promise<boolean> => {
    if (atomState.status !== "ready") return false;
    if (formatId !== "youtube_short" || promptMode !== "manual") return false;
    if (!selectedSceneId) return false;
    if (dirty) {
      setRenderError("Save this scene before preparing its render.");
      setRenderMessage(null);
      return false;
    }
    if (!selectedSceneEdits.visualPrompt.trim()) {
      setRenderError("Add a visual prompt first");
      setRenderMessage(null);
      return false;
    }
    if (selectedSceneEdits.assetType !== "image") {
      setRenderError("Only image asset scenes can be prepared in this phase");
      setRenderMessage(null);
      return false;
    }

    setRenderBusy(true);
    setRenderError(null);
    setRenderMessage(null);
    try {
      const result = await renderSavedSceneImageRequest({
        atomId: atomState.atom.atom_id,
        sceneId: selectedSceneId,
      });
      if (!result.ok) {
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
      setRenderBusy(false);
    }
  }, [
    applyReadyBundle,
    atomState,
    dirty,
    formatId,
    promptMode,
    selectedSceneEdits.assetType,
    selectedSceneEdits.visualPrompt,
    selectedSceneId,
    setPromptModeState,
    setRenderBusy,
    setRenderError,
    setRenderMessage,
  ]);

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
  };
}
