"use client";

import { Copy, FileText, ImageIcon, Mic } from "lucide-react";

import type { ContentFormatPackage } from "@/brain/content-studio";
import { Button } from "@/components/ui/button";

import type {
  SceneAssetType,
  SceneEditFields,
  StudioPromptMode,
} from "../../hooks/use-atom-content-studio";
import { FormatPrefs } from "./format-prefs";
import { GlobalVisualStyleField } from "./global-visual-style";
import { PromptCard } from "./prompt-card";
import { PromptModeToggle } from "./prompt-mode-toggle";
import { PromptRailActions } from "./prompt-rail-actions";
import { ResearchNotice } from "./research-notice";
import { SceneEditor } from "./scene-editor";

export type StudioPromptRailProps = {
  pkg: ContentFormatPackage | null;
  promptMode?: StudioPromptMode;
  onPromptModeChange?: (mode: StudioPromptMode) => void;
  selectedSceneId?: string | null;
  sceneEdits?: SceneEditFields;
  onSceneVisualPromptChange?: (v: string) => void;
  onSceneNarrationChange?: (v: string) => void;
  onSceneOnScreenTextChange?: (v: string) => void;
  onSceneAssetTypeChange?: (v: SceneAssetType) => void;
  onResetScene?: () => void | Promise<void>;
  globalVisualStyle?: string;
  onGlobalVisualStyleChange?: (v: string) => void;
  onPastePromptFill?: (prompt: string) => Promise<boolean>;
  onStartFromGenerated?: () => void;
  ingestBusy?: boolean;
  ingestError?: string | null;
  imagePrompt: string;
  voiceoverPrompt: string;
  script: string;
  onImagePromptChange: (v: string) => void;
  onVoiceoverPromptChange: (v: string) => void;
  onScriptChange: (v: string) => void;
  dirty: boolean;
  saveLabel: string;
  onSave: () => void | Promise<void>;
  onReset: () => void | Promise<void>;
  onCopyExternalPrompt?: () => void;
  promptCopied?: boolean;
};

export function StudioPromptRail({
  pkg,
  promptMode,
  onPromptModeChange,
  selectedSceneId,
  sceneEdits,
  onSceneVisualPromptChange,
  onSceneNarrationChange,
  onSceneOnScreenTextChange,
  onSceneAssetTypeChange,
  onResetScene,
  globalVisualStyle,
  onGlobalVisualStyleChange,
  onPastePromptFill,
  onStartFromGenerated,
  ingestBusy,
  ingestError,
  imagePrompt,
  voiceoverPrompt,
  script,
  onImagePromptChange,
  onVoiceoverPromptChange,
  onScriptChange,
  dirty,
  saveLabel,
  onSave,
  onReset,
  onCopyExternalPrompt,
  promptCopied,
}: StudioPromptRailProps) {
  if (!pkg) {
    return (
      <aside
        className="studio-prompt-rail text-xs text-text-secondary"
        data-testid="studio-prompt-rail-empty"
      >
        Generating format package…
      </aside>
    );
  }

  const isShort = pkg.formatId === "youtube_short";
  const mode = promptMode ?? "manual";
  const fieldsReadOnly = isShort && mode === "generated";
  const showModeToggle = isShort && Boolean(onPromptModeChange);
  const isManualWorkspace = isShort && mode === "manual";
  const selectedScene =
    isShort && selectedSceneId
      ? pkg.scenes.find((s) => s.id === selectedSceneId)
      : null;
  const showSceneEditor =
    isShort &&
    Boolean(selectedScene) &&
    Boolean(sceneEdits) &&
    Boolean(onSceneVisualPromptChange) &&
    Boolean(selectedSceneId);

  return (
    <aside
      className="studio-prompt-rail"
      data-testid="studio-prompt-rail"
      data-prompt-mode={isShort ? mode : "n/a"}
    >
      {showModeToggle && onPromptModeChange ? (
        <PromptModeToggle
          mode={mode}
          onPromptModeChange={onPromptModeChange}
        />
      ) : null}

      {isManualWorkspace &&
      onGlobalVisualStyleChange &&
      globalVisualStyle !== undefined ? (
        <GlobalVisualStyleField
          value={globalVisualStyle}
          onChange={onGlobalVisualStyleChange}
          readOnly={fieldsReadOnly}
        />
      ) : null}

      {/* Package-level clutter: Generated mode (and non-Short) only */}
      {!isManualWorkspace && pkg.status === "research_required" ? (
        <ResearchNotice unresolvedResearch={pkg.unresolvedResearch} />
      ) : null}

      {!isManualWorkspace && onCopyExternalPrompt ? (
        <Button
          type="button"
          variant="outline"
          className="studio-prompt-rail__copy h-8 justify-start rounded-xl px-2.5 text-xs"
          onClick={onCopyExternalPrompt}
          data-testid="studio-rail-copy-chatgpt"
        >
          <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          {promptCopied
            ? "Prompt copied — paste into ChatGPT"
            : "Use in ChatGPT (copy prompt)"}
        </Button>
      ) : null}

      {fieldsReadOnly ? (
        <p
          className="shrink-0 text-[10px] text-text-muted"
          data-testid="studio-prompt-mode-hint"
        >
          Generated baseline — switch to Manual to edit durable prompts.
        </p>
      ) : null}

      {!isManualWorkspace ? (
        <>
          <PromptCard
            title="Visual metaphor"
            icon={<ImageIcon className="h-3 w-3" aria-hidden />}
            value={imagePrompt}
            onChange={onImagePromptChange}
            maxHint={800}
            copyTestId="studio-copy-visual-metaphor"
            readOnly={fieldsReadOnly}
          />
          <PromptCard
            title="VO / voiceover"
            icon={<Mic className="h-3 w-3" aria-hidden />}
            value={voiceoverPrompt}
            onChange={onVoiceoverPromptChange}
            maxHint={2000}
            copyTestId="studio-copy-voiceover"
            readOnly={fieldsReadOnly}
          />
          <PromptCard
            title="Content / script"
            icon={<FileText className="h-3 w-3" aria-hidden />}
            value={script}
            onChange={onScriptChange}
            maxHint={4000}
            grow="script"
            copyTestId="studio-copy-script"
            readOnly={fieldsReadOnly}
          />
        </>
      ) : null}

      {showSceneEditor &&
      sceneEdits &&
      selectedSceneId &&
      onSceneVisualPromptChange &&
      onSceneNarrationChange &&
      onSceneOnScreenTextChange &&
      onSceneAssetTypeChange ? (
        <SceneEditor
          pkg={pkg}
          selectedSceneId={selectedSceneId}
          sceneEdits={sceneEdits}
          fieldsReadOnly={fieldsReadOnly}
          manualWorkspace={isManualWorkspace}
          ingestBusy={ingestBusy}
          ingestError={ingestError}
          onPastePromptFill={
            isManualWorkspace ? onPastePromptFill : undefined
          }
          onStartFromGenerated={
            isManualWorkspace ? onStartFromGenerated : undefined
          }
          onSceneVisualPromptChange={onSceneVisualPromptChange}
          onSceneNarrationChange={onSceneNarrationChange}
          onSceneOnScreenTextChange={onSceneOnScreenTextChange}
          onSceneAssetTypeChange={onSceneAssetTypeChange}
          onResetScene={onResetScene}
        />
      ) : null}

      {!isManualWorkspace ? (
        <FormatPrefs
          aspectRatio={pkg.aspectRatio}
          durationSeconds={pkg.durationSeconds}
        />
      ) : null}

      <PromptRailActions
        dirty={dirty}
        fieldsReadOnly={fieldsReadOnly}
        saveLabel={
          isManualWorkspace && saveLabel === "Save draft"
            ? "Save Scene"
            : saveLabel
        }
        onSave={onSave}
        onReset={onReset}
      />
    </aside>
  );
}
