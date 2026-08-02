"use client";

import type { AtomValidationReport, ContentAtom } from "@/brain/atom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { AtomReviewPanel } from "../../atom-review-panel";

type StrategyAtomDialogProps = {
  open: boolean;
  onClose: () => void;
  atom: ContentAtom;
  validation: AtomValidationReport | null;
  recordRevision: number;
};

export function StrategyAtomDialog({
  open,
  onClose,
  atom,
  validation,
  recordRevision,
}: StrategyAtomDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 p-3 sm:items-center"
      role="presentation"
      onClick={onClose}
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
            onClick={onClose}
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
  );
}
