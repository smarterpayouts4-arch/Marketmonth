"use client";

import { useState } from "react";
import { ChevronDown, Copy, Download, RefreshCw } from "lucide-react";

import type { ContentAtom } from "@/brain/atom";
import {
  computePackageAssemblyReadiness,
  type ContentFormatPackage,
} from "@/brain/content-studio";
import { Button } from "@/components/ui/button";

import { buildExternalVideoPrompt } from "../build-external-prompt";

export function useCopyChatGptPrompt(args: {
  atom: ContentAtom;
  activePackage: ContentFormatPackage | null;
  imagePrompt: string;
  voiceoverPrompt: string;
  script: string;
}) {
  const [promptCopied, setPromptCopied] = useState(false);

  async function copyChatGptPrompt() {
    const text = buildExternalVideoPrompt({
      atom: args.atom,
      pkg: args.activePackage,
      imagePrompt: args.imagePrompt,
      voiceoverPrompt: args.voiceoverPrompt,
      script: args.script,
    });
    try {
      await navigator.clipboard.writeText(text);
      setPromptCopied(true);
      window.setTimeout(() => setPromptCopied(false), 2000);
    } catch {
      setPromptCopied(false);
    }
  }

  return { promptCopied, copyChatGptPrompt };
}

type StudioHeaderActionsProps = {
  strategyOpen: boolean;
  onOpenStrategy: () => void;
  onRegenerate: () => void;
  productionLocked: boolean;
  bundleLoading: boolean;
  promptCopied: boolean;
  onCopyExternalPrompt: () => void;
  activePackage?: ContentFormatPackage | null;
  assembleBusy?: boolean;
  onAssembleFinalShort?: () => void | Promise<boolean>;
};

export function StudioHeaderActions({
  strategyOpen,
  onOpenStrategy,
  onRegenerate,
  productionLocked,
  bundleLoading,
  promptCopied,
  onCopyExternalPrompt,
  activePackage = null,
  assembleBusy = false,
  onAssembleFinalShort,
}: StudioHeaderActionsProps) {
  const isShort = activePackage?.formatId === "youtube_short";
  const readiness =
    isShort && activePackage
      ? computePackageAssemblyReadiness(
          activePackage.scenes,
          undefined,
          activePackage
        )
      : null;
  const finalShort =
    isShort && activePackage && "finalShort" in activePackage
      ? activePackage.finalShort
      : undefined;
  /** Download only when fingerprint matches current scene composition. */
  const finalReady = Boolean(readiness?.finalShortCurrent);
  const finalStale =
    finalShort?.status === "stale" ||
    (finalShort?.status === "succeeded" && !finalReady);

  return (
    <div className="studio-header__actions">
      <Button
        type="button"
        variant="outline"
        onClick={onOpenStrategy}
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
          void onCopyExternalPrompt();
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

      {isShort && readiness ? (
        <div
          className="flex items-center gap-1.5"
          data-testid="studio-export-controls"
        >
          {!readiness.allReady ? (
            <Button
              type="button"
              variant="outline"
              className="opacity-80"
              disabled
              title={readiness.label}
              data-testid="studio-export-not-ready"
            >
              {readiness.readyScenes === 0
                ? "Not ready"
                : readiness.label}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled={assembleBusy || !onAssembleFinalShort}
              title="Assemble all scene MP4s into one Short"
              data-testid="studio-assemble-final-short"
              onClick={() => {
                void onAssembleFinalShort?.();
              }}
            >
              {assembleBusy
                ? "Assembling…"
                : finalStale || !finalReady
                  ? "Assemble Final Short"
                  : "Reassemble Final Short"}
            </Button>
          )}
          {finalReady && finalShort?.assetUrl ? (
            <>
              <a
                href={finalShort.assetUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center rounded-md border border-border px-2 text-xs text-text-secondary hover:bg-muted"
                data-testid="studio-preview-full-short"
              >
                Preview Full Short
              </a>
              <a
                href={finalShort.assetUrl}
                target="_blank"
                rel="noreferrer"
                download
                className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs text-text-secondary hover:bg-muted"
                data-testid="studio-download-final-short"
                title="Download for manual YouTube upload"
              >
                <Download className="h-3 w-3" aria-hidden />
                Download for manual YouTube upload
              </a>
            </>
          ) : null}
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="opacity-60"
          disabled
          title="Export is available for YouTube Short packages"
          data-testid="studio-export-disabled"
        >
          Export
        </Button>
      )}
    </div>
  );
}
