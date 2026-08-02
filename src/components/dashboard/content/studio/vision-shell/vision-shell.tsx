"use client";

import { useEffect, useState } from "react";
import { Leaf } from "lucide-react";

import { StudioPlatformToolbar } from "../platform-toolbar";

import {
  StudioHeaderActions,
  useCopyChatGptPrompt,
} from "./studio-header-actions";
import { StrategyAtomDialog } from "./strategy-atom-dialog";
import type { VisionShellProps } from "./types";
import { YoutubeWorkspace } from "./youtube-workspace";

/**
 * Fluid Content Studio — layout sizes come from globals.css --studio-* tokens.
 */
export function VisionContentStudioShell({
  atom,
  validation,
  recordRevision,
  bundle,
  bundleLoading,
  bundleError,
  warnings,
  platform,
  onPlatformChange,
  formatId,
  onFormatChange,
  packages,
  activePackage,
  selectedSceneId,
  onSelectScene,
  promptMode,
  onPromptModeChange,
  sceneEdits,
  onSceneVisualPromptChange,
  onSceneNarrationChange,
  onSceneOnScreenTextChange,
  onSceneAssetTypeChange,
  onSceneMotionPromptChange,
  onResetScene,
  onRemoveScene,
  onAddScene,
  globalVisualStyle,
  onGlobalVisualStyleChange,
  onPastePromptFill,
  onStartFromGenerated,
  onValidateImageRender,
  onGenerateSceneVoice,
  onClearSceneVoice,
  onGenerateSceneVideo,
  onClearSceneVideo,
  onComposeSceneMp4,
  onGenerateCompleteScene,
  fullGenerateProgress,
  ingestBusy,
  ingestError,
  renderBusy,
  renderBusyMap,
  renderMessage,
  renderError,
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
  onRegenerate,
  productionLocked,
  onAssembleFinalShort,
  assembleBusy = false,
}: VisionShellProps) {
  const [strategyOpen, setStrategyOpen] = useState(false);
  const { promptCopied, copyChatGptPrompt } = useCopyChatGptPrompt({
    atom,
    activePackage,
    imagePrompt,
    voiceoverPrompt,
    script,
  });

  useEffect(() => {
    if (!strategyOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setStrategyOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [strategyOpen]);

  return (
    <div
      className="px-1 sm:px-0"
      data-studio-shell
      data-testid="vision-content-studio"
      data-source="atom"
    >
      <header className="studio-header">
        <div className="studio-header__brand flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Leaf className="h-3.5 w-3.5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[10px] font-medium uppercase tracking-[0.12em] text-text-muted">
              Content Studio
              {bundle?.atomRevision != null
                ? ` · rev ${bundle.atomRevision}`
                : ""}
            </p>
            <h1 className="truncate font-heading text-sm font-semibold leading-tight text-foreground sm:text-base">
              {atom.lineage.masterTitle}
            </h1>
          </div>
        </div>

        <StudioHeaderActions
          strategyOpen={strategyOpen}
          onOpenStrategy={() => setStrategyOpen(true)}
          onRegenerate={onRegenerate}
          productionLocked={productionLocked}
          bundleLoading={bundleLoading}
          promptCopied={promptCopied}
          onCopyExternalPrompt={copyChatGptPrompt}
          activePackage={activePackage}
          assembleBusy={assembleBusy}
          onAssembleFinalShort={onAssembleFinalShort}
        />

        <div className="studio-header__platforms">
          <StudioPlatformToolbar
            platform={platform}
            onPlatformChange={onPlatformChange}
            formatId={formatId}
            onFormatChange={onFormatChange}
            packages={packages}
          />
        </div>
      </header>

      {!productionLocked ? (
        <div
          className="shrink-0 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground"
          role="status"
          data-testid="studio-needs-lock"
        >
          Approve and lock this Content Atom before producing packages.
        </div>
      ) : null}

      {bundleError ? (
        <p className="shrink-0 text-xs text-danger" role="alert">
          {bundleError}
        </p>
      ) : null}

      {warnings.length > 0 ? (
        <ul className="shrink-0 max-h-12 overflow-y-auto rounded-lg border border-border/70 bg-card px-2.5 py-1.5 text-[11px] text-text-secondary">
          {warnings.slice(0, 3).map((w) => (
            <li key={w}>• {w}</li>
          ))}
        </ul>
      ) : null}

      {productionLocked && platform === "youtube" ? (
        <YoutubeWorkspace
          formatId={formatId}
          activePackage={activePackage}
          selectedSceneId={selectedSceneId}
          onSelectScene={onSelectScene}
          promptMode={promptMode}
          onPromptModeChange={onPromptModeChange}
          sceneEdits={sceneEdits}
          onSceneVisualPromptChange={onSceneVisualPromptChange}
          onSceneNarrationChange={onSceneNarrationChange}
          onSceneOnScreenTextChange={onSceneOnScreenTextChange}
          onSceneAssetTypeChange={onSceneAssetTypeChange}
          onSceneMotionPromptChange={onSceneMotionPromptChange}
          onResetScene={onResetScene}
          onRemoveScene={onRemoveScene}
          onAddScene={onAddScene}
          globalVisualStyle={globalVisualStyle}
          onGlobalVisualStyleChange={onGlobalVisualStyleChange}
          onPastePromptFill={onPastePromptFill}
          onStartFromGenerated={onStartFromGenerated}
          onValidateImageRender={onValidateImageRender}
          onGenerateSceneVoice={onGenerateSceneVoice}
          onClearSceneVoice={onClearSceneVoice}
          onGenerateSceneVideo={onGenerateSceneVideo}
          onClearSceneVideo={onClearSceneVideo}
          onComposeSceneMp4={onComposeSceneMp4}
          onGenerateCompleteScene={onGenerateCompleteScene}
          fullGenerateProgress={fullGenerateProgress}
          ingestBusy={ingestBusy}
          ingestError={ingestError}
          renderBusy={renderBusy}
          renderBusyMap={renderBusyMap}
          renderMessage={renderMessage}
          renderError={renderError}
          imagePrompt={imagePrompt}
          voiceoverPrompt={voiceoverPrompt}
          script={script}
          onImagePromptChange={onImagePromptChange}
          onVoiceoverPromptChange={onVoiceoverPromptChange}
          onScriptChange={onScriptChange}
          dirty={dirty}
          saveLabel={saveLabel}
          onSave={onSave}
          onReset={onReset}
          onCopyExternalPrompt={() => {
            void copyChatGptPrompt();
          }}
          promptCopied={promptCopied}
          bundleLoading={bundleLoading}
        />
      ) : productionLocked ? (
        <p className="text-sm text-text-muted">Coming soon</p>
      ) : null}

      <StrategyAtomDialog
        open={strategyOpen}
        onClose={() => setStrategyOpen(false)}
        atom={atom}
        validation={validation}
        recordRevision={recordRevision}
      />
    </div>
  );
}
