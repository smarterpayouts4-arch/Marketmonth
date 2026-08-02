"use client";

import { useState } from "react";
import { ClipboardPaste, ImageIcon, Mic, Type } from "lucide-react";

import {
  SCENE_NARRATION_MAX_CHARS,
  SCENE_ON_SCREEN_TEXT_MAX_CHARS,
  SCENE_VISUAL_PROMPT_MAX_CHARS,
  type ContentFormatPackage,
} from "@/brain/content-studio";
import { Button } from "@/components/ui/button";

import type {
  SceneAssetType,
  SceneEditFields,
} from "../../hooks/use-atom-content-studio";
import type { FullGenerateProgress } from "../../hooks/use-atom-content-studio/use-studio-edit-actions";
import { PastePromptSheet } from "./paste-prompt-sheet";
import { PromptCard } from "./prompt-card";
import { SceneAssetPanel } from "./scene-asset-panel";

type SceneEditorProps = {
  pkg: ContentFormatPackage;
  selectedSceneId: string;
  sceneEdits: SceneEditFields;
  fieldsReadOnly: boolean;
  /** Compact Manual workspace (hides nested “Scene · id” chrome). */
  manualWorkspace?: boolean;
  dirty?: boolean;
  ingestBusy?: boolean;
  ingestError?: string | null;
  renderBusy?: boolean;
  renderBusyMap?: import("../../hooks/use-atom-content-studio/render-busy").RenderBusyMap;
  renderMessage?: string | null;
  renderError?: string | null;
  saveLabel?: string;
  onSave?: () => void | Promise<void>;
  onResetFormat?: () => void | Promise<void>;
  onPastePromptFill?: (prompt: string) => Promise<boolean>;
  onStartFromGenerated?: () => void;
  onValidateImageRender?: () => void | Promise<boolean>;
  onGenerateSceneVoice?: () => void | Promise<boolean>;
  onClearSceneVoice?: () => void | Promise<boolean>;
  onGenerateSceneVideo?: () => void | Promise<boolean>;
  onClearSceneVideo?: () => void | Promise<boolean>;
  onComposeSceneMp4?: () => void | Promise<boolean>;
  onGenerateCompleteScene?: () => void | Promise<boolean>;
  fullGenerateProgress?: FullGenerateProgress | null;
  onSceneVisualPromptChange: (v: string) => void;
  onSceneNarrationChange: (v: string) => void;
  onSceneOnScreenTextChange: (v: string) => void;
  onSceneAssetTypeChange: (v: SceneAssetType) => void;
  onSceneMotionPromptChange: (v: string) => void;
  onResetScene?: () => void | Promise<void>;
};

export function SceneEditor({
  pkg,
  selectedSceneId,
  sceneEdits,
  fieldsReadOnly,
  manualWorkspace = false,
  dirty = false,
  ingestBusy = false,
  ingestError = null,
  renderBusy = false,
  renderBusyMap,
  renderMessage = null,
  renderError = null,
  saveLabel = "Save Scene",
  onSave,
  onResetFormat,
  onPastePromptFill,
  onStartFromGenerated,
  onValidateImageRender,
  onGenerateSceneVoice,
  onClearSceneVoice,
  onGenerateSceneVideo,
  onClearSceneVideo,
  onComposeSceneMp4,
  onGenerateCompleteScene,
  fullGenerateProgress = null,
  onSceneVisualPromptChange,
  onSceneNarrationChange,
  onSceneOnScreenTextChange,
  onSceneAssetTypeChange,
  onSceneMotionPromptChange,
  onResetScene,
}: SceneEditorProps) {
  const [pasteOpen, setPasteOpen] = useState(false);
  const selectedScene = pkg.scenes.find((s) => s.id === selectedSceneId);
  const sceneIndex = selectedScene ? selectedScene.order + 1 : null;
  const sceneCount = pkg.scenes.length;
  const sceneLabel =
    sceneIndex != null
      ? `Scene ${sceneIndex} of ${sceneCount}`
      : "Selected scene";

  const showAssetWorkflow =
    manualWorkspace &&
    !fieldsReadOnly &&
    Boolean(onValidateImageRender) &&
    Boolean(onSave) &&
    Boolean(onResetFormat);

  return (
    <div
      className={
        manualWorkspace
          ? "space-y-2"
          : "studio-prompt-card studio-prompt-card--compact"
      }
      data-testid="studio-scene-editor"
      data-scene-id={selectedSceneId}
      data-manual-workspace={manualWorkspace ? "true" : "false"}
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className="studio-prompt-card__title"
          data-testid="studio-scene-label"
        >
          {manualWorkspace
            ? sceneLabel
            : `Scene ${sceneIndex ?? "—"} · ${selectedSceneId}`}
        </p>
        {!manualWorkspace && onResetScene ? (
          <button
            type="button"
            className="text-[10px] text-text-muted underline-offset-2 hover:underline"
            onClick={() => {
              void onResetScene();
            }}
            data-testid="studio-reset-scene"
          >
            Reset scene
          </button>
        ) : null}
      </div>

      {manualWorkspace && onPastePromptFill && !fieldsReadOnly ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            className="h-8 rounded-xl px-2.5 text-xs"
            onClick={() => setPasteOpen(true)}
            data-testid="studio-paste-prompt"
          >
            <ClipboardPaste className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Paste Prompt
          </Button>
          {onStartFromGenerated ? (
            <button
              type="button"
              className="text-[10px] text-text-muted underline-offset-2 hover:underline"
              onClick={onStartFromGenerated}
              data-testid="studio-start-from-generated"
            >
              Start from generated scene
            </button>
          ) : null}
          {onResetScene ? (
            <button
              type="button"
              className="text-[10px] text-text-muted underline-offset-2 hover:underline"
              onClick={() => {
                void onResetScene();
              }}
              data-testid="studio-reset-scene"
            >
              Reset Scene
            </button>
          ) : null}
        </div>
      ) : null}

      <div
        className={
          manualWorkspace
            ? "space-y-1.5"
            : "mt-1.5 space-y-1.5 border-t border-border/50 pt-1.5"
        }
      >
        <PromptCard
          title="Visual Prompt"
          icon={<ImageIcon className="h-3 w-3" aria-hidden />}
          value={sceneEdits.visualPrompt}
          onChange={onSceneVisualPromptChange}
          maxHint={SCENE_VISUAL_PROMPT_MAX_CHARS}
          copyTestId="studio-copy-scene-visual"
          readOnly={fieldsReadOnly}
          compact
        />
        <PromptCard
          title="Narration"
          icon={<Mic className="h-3 w-3" aria-hidden />}
          value={sceneEdits.narration}
          onChange={onSceneNarrationChange}
          maxHint={SCENE_NARRATION_MAX_CHARS}
          copyTestId="studio-copy-scene-narration"
          readOnly={fieldsReadOnly}
          compact
        />
        <PromptCard
          title="On-Screen Text"
          icon={<Type className="h-3 w-3" aria-hidden />}
          value={sceneEdits.onScreenText}
          onChange={onSceneOnScreenTextChange}
          maxHint={SCENE_ON_SCREEN_TEXT_MAX_CHARS}
          copyTestId="studio-copy-scene-onscreen"
          readOnly={fieldsReadOnly}
          compact
        />

        {showAssetWorkflow && onSave && onResetFormat ? (
          <SceneAssetPanel
            pkg={pkg}
            selectedSceneId={selectedSceneId}
            sceneEdits={sceneEdits}
            fieldsReadOnly={fieldsReadOnly}
            dirty={dirty}
            renderBusy={renderBusy}
            renderBusyMap={renderBusyMap}
            renderMessage={renderMessage}
            renderError={renderError}
            saveLabel={saveLabel}
            onSave={onSave}
            onReset={onResetFormat}
            onSceneAssetTypeChange={onSceneAssetTypeChange}
            onSceneMotionPromptChange={onSceneMotionPromptChange}
            onValidateImageRender={onValidateImageRender}
            onGenerateSceneVoice={onGenerateSceneVoice}
            onClearSceneVoice={onClearSceneVoice}
            onGenerateSceneVideo={onGenerateSceneVideo}
            onClearSceneVideo={onClearSceneVideo}
            onComposeSceneMp4={onComposeSceneMp4}
            onGenerateCompleteScene={onGenerateCompleteScene}
            fullGenerateProgress={fullGenerateProgress}
          />
        ) : !manualWorkspace ? (
          <div
            className="flex items-center justify-between gap-2 text-xs"
            data-testid="studio-scene-asset-type"
          >
            <span className="text-text-muted">Asset Type</span>
            <div
              className="studio-prompt-mode"
              role="group"
              aria-label="Asset type"
            >
              <button
                type="button"
                className="studio-prompt-mode__btn"
                data-active={
                  sceneEdits.assetType === "image" ? "true" : "false"
                }
                aria-pressed={sceneEdits.assetType === "image"}
                disabled={fieldsReadOnly}
                onClick={() => onSceneAssetTypeChange("image")}
                data-testid="studio-scene-asset-image"
              >
                Image
              </button>
              <button
                type="button"
                className="studio-prompt-mode__btn"
                data-active={
                  sceneEdits.assetType === "video" ? "true" : "false"
                }
                aria-pressed={sceneEdits.assetType === "video"}
                disabled={fieldsReadOnly}
                onClick={() => onSceneAssetTypeChange("video")}
                data-testid="studio-scene-asset-video"
              >
                Video
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {onPastePromptFill ? (
        <PastePromptSheet
          open={pasteOpen}
          onOpenChange={setPasteOpen}
          sceneLabel={sceneLabel}
          busy={ingestBusy}
          error={ingestError}
          onFillScene={async (prompt) => {
            const ok = await onPastePromptFill(prompt);
            if (ok) setPasteOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
