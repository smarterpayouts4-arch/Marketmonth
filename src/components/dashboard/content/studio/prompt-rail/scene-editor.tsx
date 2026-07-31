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
import { PastePromptSheet } from "./paste-prompt-sheet";
import { PromptCard } from "./prompt-card";

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
  renderMessage?: string | null;
  renderError?: string | null;
  onPastePromptFill?: (prompt: string) => Promise<boolean>;
  onStartFromGenerated?: () => void;
  onValidateImageRender?: () => void | Promise<boolean>;
  onSceneVisualPromptChange: (v: string) => void;
  onSceneNarrationChange: (v: string) => void;
  onSceneOnScreenTextChange: (v: string) => void;
  onSceneAssetTypeChange: (v: SceneAssetType) => void;
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
  renderMessage = null,
  renderError = null,
  onPastePromptFill,
  onStartFromGenerated,
  onValidateImageRender,
  onSceneVisualPromptChange,
  onSceneNarrationChange,
  onSceneOnScreenTextChange,
  onSceneAssetTypeChange,
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

  const durableRender =
    selectedScene && "render" in selectedScene
      ? selectedScene.render
      : undefined;
  const durableDryRunOk = durableRender?.status === "dry_run_succeeded";
  const durableFailed = durableRender?.status === "failed";

  const dryRunDisabledReason = !sceneEdits.visualPrompt.trim()
    ? "Add a visual prompt first"
    : sceneEdits.assetType !== "image"
      ? "Only image asset scenes can be prepared in this phase"
      : dirty
        ? "Save this scene before preparing its render."
        : renderBusy
          ? "Validating render path…"
          : null;
  const dryRunDisabled = Boolean(dryRunDisabledReason) || !onValidateImageRender;

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
        <div
          className="flex items-center justify-between gap-2 text-xs"
          data-testid="studio-scene-asset-type"
        >
          <span className="text-text-muted">Asset Type</span>
          <div className="studio-prompt-mode" role="group" aria-label="Asset type">
            <button
              type="button"
              className="studio-prompt-mode__btn"
              data-active={sceneEdits.assetType === "image" ? "true" : "false"}
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
              data-active={sceneEdits.assetType === "video" ? "true" : "false"}
              aria-pressed={sceneEdits.assetType === "video"}
              disabled={fieldsReadOnly}
              onClick={() => onSceneAssetTypeChange("video")}
              data-testid="studio-scene-asset-video"
            >
              Video
            </button>
          </div>
        </div>

        {manualWorkspace && !fieldsReadOnly ? (
          <div className="space-y-1" data-testid="studio-validate-image-render">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="h-8 flex-1 rounded-lg border border-dashed border-border px-3 text-xs text-text-muted disabled:opacity-60"
                disabled={dryRunDisabled}
                title={dryRunDisabledReason ?? "Validate dry-run renderer path"}
                onClick={() => {
                  void onValidateImageRender?.();
                }}
                data-testid="studio-generate-image-shell"
              >
                {renderBusy
                  ? "Validating Image Render…"
                  : "Validate Image Render"}
              </button>
              <span
                className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-text-muted"
                data-testid="studio-dry-run-badge"
              >
                Dry run
              </span>
            </div>
            {dirty ? (
              <p
                className="text-[10px] text-text-muted"
                data-testid="studio-render-save-hint"
              >
                Save this scene before preparing its render.
              </p>
            ) : null}
            {renderBusy ? (
              <p
                className="text-[10px] text-text-muted"
                data-testid="studio-render-loading"
              >
                Checking renderer path…
              </p>
            ) : null}
            {renderError ? (
              <p
                className="text-[10px] text-red-600"
                data-testid="studio-render-error"
              >
                {renderError}
              </p>
            ) : null}
            {renderMessage || durableDryRunOk ? (
              <p
                className="text-[10px] text-text-secondary"
                data-testid="studio-render-success"
              >
                {renderMessage ??
                  "Renderer path verified — no image generated"}
              </p>
            ) : null}
            {!renderError && durableFailed && durableRender?.error ? (
              <p
                className="text-[10px] text-red-600"
                data-testid="studio-render-durable-error"
              >
                {durableRender.error.message}
              </p>
            ) : null}
          </div>
        ) : null}

        {manualWorkspace && onResetScene && !fieldsReadOnly ? (
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
