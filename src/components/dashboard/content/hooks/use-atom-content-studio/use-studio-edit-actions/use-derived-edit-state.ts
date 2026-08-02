import { useCallback, useMemo } from "react";

import type { ContentFormatId } from "@/brain/content-studio";

import {
  baselineEditsFromPackage,
  baselineSceneFields,
  buildScenePatches,
  editsFromPackage,
  isShortPackage,
  resolveGlobalVisualStyle,
  sceneEditsFromPackage,
} from "../package-edit-helpers";
import {
  EMPTY_EDITS,
  EMPTY_SCENE,
  type FormatEdits,
  type SceneEditFields,
  type StudioPromptMode,
} from "../types";

import type { StudioEditActionsDeps } from "./types";

type DerivedEditStateDeps = Pick<
  StudioEditActionsDeps,
  | "packages"
  | "formatId"
  | "setFormatIdState"
  | "selectedSceneId"
  | "setSelectedSceneId"
  | "editsByFormat"
  | "setEditsByFormat"
  | "sceneEditsById"
  | "setSceneEditsById"
  | "promptMode"
  | "setPromptModeState"
  | "setSaveLabel"
>;

export function useDerivedEditState({
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
}: DerivedEditStateDeps) {
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

  return {
    activePackage,
    setFormatId,
    edits,
    selectedSceneEdits,
    dirty,
    setPromptMode,
    setEditField,
    setSceneEditField,
  };
}
