"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const primaryClass =
  "inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

type ContentPrimaryActionsProps = {
  onSaveDraft: () => void;
  canContinue: boolean;
  draftSavedAt?: string | null;
};

/** Top-right workflow actions — Save Draft + Continue to Review. */
export function ContentPrimaryActions({
  onSaveDraft,
  canContinue,
  draftSavedAt,
}: ContentPrimaryActionsProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {draftSavedAt ? (
        <p className="text-[11px] text-text-muted" aria-live="polite">
          Draft saved
        </p>
      ) : null}
      <Button
        type="button"
        variant="outline"
        onClick={onSaveDraft}
        className="h-8 rounded-lg px-3 text-sm"
      >
        Save Draft
      </Button>
      {canContinue ? (
        <Link href="/review" className={primaryClass}>
          Continue to Review →
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className={cn(primaryClass)}
          title="Validate the current package before continuing"
          aria-describedby="continue-disabled-reason"
        >
          Continue to Review →
        </button>
      )}
      {!canContinue ? (
        <span id="continue-disabled-reason" className="sr-only">
          Continue stays disabled until the active package passes required
          validation.
        </span>
      ) : null}
    </div>
  );
}

type ContentGenerateActionProps = {
  onGenerateNew: () => void;
  disabled?: boolean;
};

/** Compact regenerate control under the preview workspace. */
export function ContentGenerateAction({
  onGenerateNew,
  disabled,
}: ContentGenerateActionProps) {
  return (
    <div className="flex shrink-0 items-center">
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={onGenerateNew}
        className="h-8 rounded-lg px-3 text-sm"
      >
        <Plus className="size-3.5" aria-hidden />
        Generate New
      </Button>
    </div>
  );
}
