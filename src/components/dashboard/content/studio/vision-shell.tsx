"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Copy, Leaf, RefreshCw } from "lucide-react";

import type { AtomValidationReport, ContentAtom } from "@/brain/atom";
import type {
  ContentFormatId,
  ContentFormatPackage,
  ContentProductionBundle,
  PlatformId,
} from "@/brain/content-studio";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type {
  SceneAssetType,
  SceneEditFields,
  StudioPromptMode,
} from "../hooks/use-atom-content-studio";
import { AtomReviewPanel } from "../atom-review-panel";
import { buildExternalVideoPrompt } from "./build-external-prompt";
import { StudioPlatformToolbar } from "./platform-toolbar";
import { StudioPreviewCanvas } from "./preview-canvas";
import { StudioPromptRail } from "./prompt-rail";
import { StudioStoryboard } from "./storyboard";

type VisionShellProps = {
  atom: ContentAtom;
  validation: AtomValidationReport | null;
  recordRevision: number;
  bundle: ContentProductionBundle | null;
  bundleLoading: boolean;
  bundleError: string | null;
  warnings: string[];
  platform: PlatformId;
  onPlatformChange: (id: PlatformId) => void;
  formatId: ContentFormatId;
  onFormatChange: (id: ContentFormatId) => void;
  packages: ContentFormatPackage[];
  activePackage: ContentFormatPackage | null;
  selectedSceneId: string | null;
  onSelectScene: (id: string) => void;
  promptMode: StudioPromptMode;
  onPromptModeChange: (mode: StudioPromptMode) => void;
  sceneEdits: SceneEditFields;
  onSceneVisualPromptChange: (v: string) => void;
  onSceneNarrationChange: (v: string) => void;
  onSceneOnScreenTextChange: (v: string) => void;
  onSceneAssetTypeChange: (v: SceneAssetType) => void;
  onResetScene: () => void | Promise<void>;
  onRemoveScene?: () => void | Promise<void>;
  onAddScene?: () => void | Promise<void>;
  globalVisualStyle?: string;
  onGlobalVisualStyleChange?: (v: string) => void;
  onPastePromptFill?: (prompt: string) => Promise<boolean>;
  onStartFromGenerated?: () => void;
  onValidateImageRender?: () => void | Promise<boolean>;
  ingestBusy?: boolean;
  ingestError?: string | null;
  renderBusy?: boolean;
  renderMessage?: string | null;
  renderError?: string | null;
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
  onRegenerate: () => void;
  productionLocked: boolean;
};

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
  onResetScene,
  onRemoveScene,
  onAddScene,
  globalVisualStyle,
  onGlobalVisualStyleChange,
  onPastePromptFill,
  onStartFromGenerated,
  onValidateImageRender,
  ingestBusy,
  ingestError,
  renderBusy,
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
}: VisionShellProps) {
  const [strategyOpen, setStrategyOpen] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  useEffect(() => {
    if (!strategyOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setStrategyOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [strategyOpen]);

  async function copyChatGptPrompt() {
    const text = buildExternalVideoPrompt({
      atom,
      pkg: activePackage,
      imagePrompt,
      voiceoverPrompt,
      script,
    });
    try {
      await navigator.clipboard.writeText(text);
      setPromptCopied(true);
      window.setTimeout(() => setPromptCopied(false), 2000);
    } catch {
      setPromptCopied(false);
    }
  }

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

        <div className="studio-header__actions">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStrategyOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={strategyOpen}
            title="Strategy / Content Atom"
            data-testid="studio-strategy-toggle"
          >
            Strategy
            <ChevronDown className="ml-0.5 h-3 w-3 text-text-muted" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void copyChatGptPrompt();
            }}
            data-testid="studio-copy-chatgpt-prompt"
            title="Copy a ChatGPT-ready prompt from this atom + draft"
          >
            <Copy className="mr-1 h-3 w-3" aria-hidden />
            {promptCopied ? "Copied" : "Prompt"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!productionLocked || bundleLoading}
            onClick={onRegenerate}
            title="Regenerate format packages"
            data-testid="studio-regenerate"
          >
            <RefreshCw className="mr-1 h-3 w-3" aria-hidden />
            Regen
          </Button>
          <Button
            type="button"
            variant="outline"
            className="opacity-60"
            disabled
            title="Export requires a connected renderer — not available yet"
            data-testid="studio-export-disabled"
          >
            Export
          </Button>
        </div>

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
        <div className="studio-workspace">
          <div className="studio-workspace__rail">
            <StudioPromptRail
              pkg={activePackage}
              promptMode={
                formatId === "youtube_short" ? promptMode : undefined
              }
              onPromptModeChange={
                formatId === "youtube_short" ? onPromptModeChange : undefined
              }
              selectedSceneId={
                formatId === "youtube_short" ? selectedSceneId : undefined
              }
              sceneEdits={
                formatId === "youtube_short" ? sceneEdits : undefined
              }
              onSceneVisualPromptChange={
                formatId === "youtube_short"
                  ? onSceneVisualPromptChange
                  : undefined
              }
              onSceneNarrationChange={
                formatId === "youtube_short"
                  ? onSceneNarrationChange
                  : undefined
              }
              onSceneOnScreenTextChange={
                formatId === "youtube_short"
                  ? onSceneOnScreenTextChange
                  : undefined
              }
              onSceneAssetTypeChange={
                formatId === "youtube_short"
                  ? onSceneAssetTypeChange
                  : undefined
              }
              onResetScene={
                formatId === "youtube_short" ? onResetScene : undefined
              }
              globalVisualStyle={
                formatId === "youtube_short" ? globalVisualStyle : undefined
              }
              onGlobalVisualStyleChange={
                formatId === "youtube_short"
                  ? onGlobalVisualStyleChange
                  : undefined
              }
              onPastePromptFill={
                formatId === "youtube_short" ? onPastePromptFill : undefined
              }
              onStartFromGenerated={
                formatId === "youtube_short" ? onStartFromGenerated : undefined
              }
              onValidateImageRender={
                formatId === "youtube_short" ? onValidateImageRender : undefined
              }
              ingestBusy={
                formatId === "youtube_short" ? ingestBusy : undefined
              }
              ingestError={
                formatId === "youtube_short" ? ingestError : undefined
              }
              renderBusy={
                formatId === "youtube_short" ? renderBusy : undefined
              }
              renderMessage={
                formatId === "youtube_short" ? renderMessage : undefined
              }
              renderError={
                formatId === "youtube_short" ? renderError : undefined
              }
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
            />
          </div>
          <div className="studio-workspace__stage">
            {bundleLoading && !activePackage ? (
              <div className="studio-preview-band items-center justify-center text-sm text-text-secondary">
                Building YouTube packages…
              </div>
            ) : (
              <StudioPreviewCanvas
                pkg={activePackage}
                selectedSceneId={selectedSceneId}
              />
            )}
            <StudioStoryboard
              pkg={activePackage}
              selectedSceneId={selectedSceneId}
              onSelectScene={onSelectScene}
              promptMode={
                formatId === "youtube_short" ? promptMode : undefined
              }
              onAddScene={
                formatId === "youtube_short" ? onAddScene : undefined
              }
              onRemoveSelectedScene={
                formatId === "youtube_short" ? onRemoveScene : undefined
              }
            />
          </div>
        </div>
      ) : productionLocked ? (
        <p className="text-sm text-text-muted">Coming soon</p>
      ) : null}

      {strategyOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 p-3 sm:items-center"
          role="presentation"
          onClick={() => setStrategyOpen(false)}
          data-testid="studio-strategy-overlay"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="studio-strategy-title"
            className={cn(
              "flex max-h-[min(88dvh,720px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-soft"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
              <h2
                id="studio-strategy-title"
                className="font-heading text-base font-semibold text-foreground"
              >
                Content Atom — strategy behind this content
              </h2>
              <Button
                type="button"
                variant="ghost"
                className="h-8 px-2 text-xs"
                onClick={() => setStrategyOpen(false)}
              >
                Close
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <AtomReviewPanel
                atom={atom}
                validation={validation}
                recordRevision={recordRevision}
                readOnly
                defaultCollapsed={false}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
