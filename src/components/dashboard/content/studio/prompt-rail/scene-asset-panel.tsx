"use client";

import { computeSceneReadiness } from "@/brain/content-studio";

import { PromptRailActions } from "./prompt-rail-actions";
import { computeAssetActionState } from "./scene-asset-panel/asset-action-state";
import { ComposeCard } from "./scene-asset-panel/compose-card";
import { ReadinessChecklist } from "./scene-asset-panel/readiness-checklist";
import { StillTypeSection } from "./scene-asset-panel/still-type-section";
import type { SceneAssetPanelProps } from "./scene-asset-panel/types";
import { VoiceCard } from "./scene-asset-panel/voice-card";

export type { SceneAssetPanelProps } from "./scene-asset-panel/types";

/**
 * Thin orchestra: derive action/readiness state, compose section components.
 * Implementation pieces live in `./scene-asset-panel/`.
 */
export function SceneAssetPanel({
  pkg,
  selectedSceneId,
  sceneEdits,
  fieldsReadOnly,
  dirty,
  renderBusy = false,
  renderBusyMap = {},
  renderMessage,
  renderError,
  saveLabel,
  onSave,
  onReset,
  onSceneAssetTypeChange,
  onSceneMotionPromptChange,
  onValidateImageRender,
  onGenerateSceneVoice,
  onClearSceneVoice,
  onGenerateSceneVideo,
  onClearSceneVideo,
  onComposeSceneMp4,
  onGenerateCompleteScene,
  fullGenerateProgress = null,
}: SceneAssetPanelProps) {
  const state = computeAssetActionState({
    pkg,
    selectedSceneId,
    sceneEdits,
    dirty,
    renderBusy,
    renderBusyMap,
    fullGenerateProgress,
    onValidateImageRender,
    onGenerateSceneVoice,
    onGenerateSceneVideo,
    onComposeSceneMp4,
    onGenerateCompleteScene,
  });

  const selectedScene = pkg.scenes.find((s) => s.id === selectedSceneId);
  const readiness =
    selectedScene && "visualPrompt" in selectedScene
      ? computeSceneReadiness({
          scene: selectedScene,
          promptSaved: !dirty,
        })
      : null;

  return (
    <section
      className="studio-asset-panel"
      data-testid="studio-validate-image-render"
      aria-label="Scene asset workflow"
    >
      {readiness ? <ReadinessChecklist readiness={readiness} /> : null}

      <StillTypeSection
        sceneEdits={sceneEdits}
        fieldsReadOnly={fieldsReadOnly}
        dirty={dirty}
        renderError={renderError}
        renderMessage={renderMessage}
        state={state}
        onSceneAssetTypeChange={onSceneAssetTypeChange}
        onSceneMotionPromptChange={onSceneMotionPromptChange}
        onValidateImageRender={onValidateImageRender}
        onGenerateSceneVideo={onGenerateSceneVideo}
        onClearSceneVideo={onClearSceneVideo}
      />

      <VoiceCard
        state={state}
        onGenerateSceneVoice={onGenerateSceneVoice}
        onClearSceneVoice={onClearSceneVoice}
      />

      <ComposeCard
        state={state}
        fullGenerateProgress={fullGenerateProgress}
        onComposeSceneMp4={onComposeSceneMp4}
        onGenerateCompleteScene={onGenerateCompleteScene}
      />

      <div className="studio-asset-panel__footer">
        <PromptRailActions
          dirty={dirty}
          fieldsReadOnly={fieldsReadOnly}
          isManualWorkspace
          embedded
          saveLabel={saveLabel}
          onSave={onSave}
          onReset={onReset}
        />
      </div>
    </section>
  );
}
