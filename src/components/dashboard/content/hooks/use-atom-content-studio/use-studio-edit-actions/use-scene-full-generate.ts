import { useCallback, useState } from "react";

import {
  planSceneFullGenerate,
  type ContentFormatPackage,
  type ContentProductionBundle,
  type SceneCard,
} from "@/brain/content-studio";

import {
  buildScenePatches,
  isShortPackage,
  resolveGlobalVisualStyle,
} from "../package-edit-helpers";
import {
  patchShortDurableEdits,
  renderSavedSceneComposedVideoRequest,
  renderSavedSceneImageRequest,
  renderSavedSceneVideoRequest,
  renderSavedSceneVoiceRequest,
} from "../studio-production-api";
import { isAnyRenderBusy, type RenderBusyMap } from "../render-busy";
import type {
  FormatEdits,
  SceneEditFields,
  StudioPromptMode,
} from "../types";

import type { StudioEditActionsDeps } from "./types";

export type FullGenerateStepId =
  | "save"
  | "image"
  | "voice"
  | "veo"
  | "compose";

export type FullGenerateStepStatus =
  | "pending"
  | "running"
  | "done"
  | "reused"
  | "skipped"
  | "error";

export type FullGenerateProgress = {
  active: boolean;
  steps: Record<FullGenerateStepId, FullGenerateStepStatus>;
  error: string | null;
};

const IDLE_STEPS: Record<FullGenerateStepId, FullGenerateStepStatus> = {
  save: "pending",
  image: "pending",
  voice: "pending",
  veo: "pending",
  compose: "pending",
};

type SceneFullGenerateDeps = Pick<
  StudioEditActionsDeps,
  | "atomState"
  | "formatId"
  | "selectedSceneId"
  | "sceneEditsById"
  | "setPromptModeState"
  | "setRenderBusy"
  | "renderBusyMap"
  | "setRenderMessage"
  | "setRenderError"
  | "setSaveLabel"
  | "applyReadyBundle"
> & {
  promptMode: StudioPromptMode;
  dirty: boolean;
  selectedSceneEdits: SceneEditFields;
  activePackage: ContentFormatPackage | null;
  edits: FormatEdits;
};

function shortSceneFromBundle(
  bundle: ContentProductionBundle,
  sceneId: string
): SceneCard | null {
  const pkg = bundle.packages.find((p) => p.formatId === "youtube_short");
  if (!pkg) return null;
  return pkg.scenes.find((s) => s.id === sceneId) ?? null;
}

export function useSceneFullGenerate({
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
}: SceneFullGenerateDeps) {
  const [fullGenerateProgress, setFullGenerateProgress] =
    useState<FullGenerateProgress>({
      active: false,
      steps: { ...IDLE_STEPS },
      error: null,
    });

  const setStep = useCallback(
    (id: FullGenerateStepId, status: FullGenerateStepStatus) => {
      setFullGenerateProgress((prev) => ({
        ...prev,
        steps: { ...prev.steps, [id]: status },
      }));
    },
    []
  );

  const generateCompleteScene = useCallback(async (): Promise<boolean> => {
    if (atomState.status !== "ready") return false;
    if (formatId !== "youtube_short" || promptMode !== "manual") return false;
    if (!selectedSceneId || !activePackage || !isShortPackage(activePackage)) {
      return false;
    }
    if (isAnyRenderBusy(renderBusyMap as RenderBusyMap)) {
      setRenderError("A scene generation step is already running.");
      setRenderMessage(null);
      return false;
    }

    const scene0 = activePackage.scenes.find((s) => s.id === selectedSceneId);
    if (!scene0) return false;

    if (!selectedSceneEdits.visualPrompt.trim()) {
      setRenderError("Add a visual prompt first");
      setRenderMessage(null);
      return false;
    }
    if (!selectedSceneEdits.narration.trim()) {
      setRenderError("Add narration first");
      setRenderMessage(null);
      return false;
    }
    if (
      selectedSceneEdits.assetType === "video" &&
      !selectedSceneEdits.motionPrompt.trim()
    ) {
      setRenderError(
        "Add and save Motion Prompt instructions before generating video."
      );
      setRenderMessage(null);
      return false;
    }

    const styleBase = resolveGlobalVisualStyle(activePackage);
    const styleChanged = edits.globalVisualStyle !== styleBase;
    const scenePatches = buildScenePatches(activePackage, sceneEditsById);
    const needsSave =
      dirty ||
      styleChanged ||
      Boolean(scenePatches[selectedSceneId]);

    const initialPlan = planSceneFullGenerate({
      scene: scene0,
      target: selectedSceneEdits,
      needsSave,
      styleChanged,
    });

    setFullGenerateProgress({
      active: true,
      error: null,
      steps: {
        save: initialPlan.save ? "pending" : "skipped",
        image: initialPlan.image === "reuse" ? "reused" : "pending",
        voice: initialPlan.voice === "reuse" ? "reused" : "pending",
        veo:
          initialPlan.veo === "skip"
            ? "skipped"
            : initialPlan.veo === "reuse"
              ? "reused"
              : "pending",
        compose: initialPlan.compose === "reuse" ? "reused" : "pending",
      },
    });
    setRenderBusy("full", true);
    setRenderError(null);
    setRenderMessage(null);

    const atomId = atomState.atom.atom_id;
    let workingScene = scene0;
    let plan = initialPlan;

    try {
      if (plan.save) {
        setStep("save", "running");
        setSaveLabel("Saving…");
        const result = await patchShortDurableEdits({
          atomId,
          edits: {
            ...(Object.keys(scenePatches).length > 0
              ? { scenes: scenePatches }
              : {}),
            ...(styleChanged
              ? { globalVisualStyle: edits.globalVisualStyle }
              : {}),
          },
        });
        if (!result.ok) {
          setStep("save", "error");
          setSaveLabel(result.error);
          setRenderError(result.error);
          setFullGenerateProgress((prev) => ({
            ...prev,
            active: false,
            error: result.error,
          }));
          return false;
        }
        applyReadyBundle(result.bundle);
        setPromptModeState("manual");
        setSaveLabel("Saved");
        const next = shortSceneFromBundle(result.bundle, selectedSceneId);
        if (!next) {
          setStep("save", "error");
          setRenderError("Scene missing after save");
          setFullGenerateProgress((prev) => ({
            ...prev,
            active: false,
            error: "Scene missing after save",
          }));
          return false;
        }
        workingScene = next;
        setStep("save", "done");
        plan = planSceneFullGenerate({
          scene: workingScene,
          target: selectedSceneEdits,
          needsSave: false,
          styleChanged: false,
        });
        // Refresh step marks for reuse after save
        setFullGenerateProgress((prev) => ({
          ...prev,
          steps: {
            ...prev.steps,
            save: "done",
            image: plan.image === "reuse" ? "reused" : "pending",
            voice: plan.voice === "reuse" ? "reused" : "pending",
            veo:
              plan.veo === "skip"
                ? "skipped"
                : plan.veo === "reuse"
                  ? "reused"
                  : "pending",
            compose: plan.compose === "reuse" ? "reused" : "pending",
          },
        }));
      }

      if (plan.image === "generate") {
        setStep("image", "running");
        const result = await renderSavedSceneImageRequest({
          atomId,
          sceneId: selectedSceneId,
        });
        if (result.bundle) {
          applyReadyBundle(result.bundle);
          setPromptModeState("manual");
          const next = shortSceneFromBundle(result.bundle, selectedSceneId);
          if (next) workingScene = next;
        }
        if (!result.ok) {
          setStep("image", "error");
          setRenderError(result.error);
          setFullGenerateProgress((prev) => ({
            ...prev,
            active: false,
            error: result.error,
          }));
          return false;
        }
        setStep("image", "done");
        setRenderMessage(result.message);
      }

      if (plan.voice === "generate") {
        setStep("voice", "running");
        const result = await renderSavedSceneVoiceRequest({
          atomId,
          sceneId: selectedSceneId,
        });
        if (result.bundle) {
          applyReadyBundle(result.bundle);
          setPromptModeState("manual");
          const next = shortSceneFromBundle(result.bundle, selectedSceneId);
          if (next) workingScene = next;
        }
        if (!result.ok) {
          setStep("voice", "error");
          setRenderError(result.error);
          setFullGenerateProgress((prev) => ({
            ...prev,
            active: false,
            error: result.error,
          }));
          return false;
        }
        setStep("voice", "done");
        setRenderMessage(result.message);
      }

      if (plan.veo === "generate") {
        setStep("veo", "running");
        const result = await renderSavedSceneVideoRequest({
          atomId,
          sceneId: selectedSceneId,
        });
        if (result.bundle) {
          applyReadyBundle(result.bundle);
          setPromptModeState("manual");
          const next = shortSceneFromBundle(result.bundle, selectedSceneId);
          if (next) workingScene = next;
        }
        if (!result.ok) {
          setStep("veo", "error");
          setRenderError(result.error);
          setFullGenerateProgress((prev) => ({
            ...prev,
            active: false,
            error: result.error,
          }));
          return false;
        }
        setStep("veo", "done");
        setRenderMessage(result.message);
      }

      if (plan.compose === "generate") {
        setStep("compose", "running");
        const result = await renderSavedSceneComposedVideoRequest({
          atomId,
          sceneId: selectedSceneId,
        });
        if (result.bundle) {
          applyReadyBundle(result.bundle);
          setPromptModeState("manual");
        }
        if (!result.ok) {
          setStep("compose", "error");
          setRenderError(result.error);
          setFullGenerateProgress((prev) => ({
            ...prev,
            active: false,
            error: result.error,
          }));
          return false;
        }
        setStep("compose", "done");
        setRenderMessage(result.message);
      }

      setFullGenerateProgress((prev) => ({
        ...prev,
        active: false,
        error: null,
      }));
      setRenderMessage("Complete scene ready");
      return true;
    } catch {
      const message = "Network error during Generate Complete Scene";
      setRenderError(message);
      setFullGenerateProgress((prev) => ({
        ...prev,
        active: false,
        error: message,
      }));
      return false;
    } finally {
      setRenderBusy("full", false);
    }
  }, [
    activePackage,
    applyReadyBundle,
    atomState,
    dirty,
    edits.globalVisualStyle,
    formatId,
    promptMode,
    renderBusyMap,
    sceneEditsById,
    selectedSceneEdits,
    selectedSceneId,
    setPromptModeState,
    setRenderBusy,
    setRenderError,
    setRenderMessage,
    setSaveLabel,
    setStep,
  ]);

  return { generateCompleteScene, fullGenerateProgress };
}
