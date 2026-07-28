"use client";

import { useEffect, useId, useRef } from "react";

import { Button } from "@/components/ui/button";

import type { ContentChannel, ProductionPackage } from "./types";
import { PlatformPreviewFrame } from "./platform-preview-frame";

type PreviewViewDialogProps = {
  open: boolean;
  onClose: () => void;
  channel: ContentChannel;
  pkg: ProductionPackage;
  brandName: string;
  headlineOverride?: string;
  returnFocusRef: React.RefObject<HTMLButtonElement | null>;
};

/** Large modal for inspecting the platform preview without crowding the studio. */
export function PreviewViewDialog({
  open,
  onClose,
  channel,
  pkg,
  brandName,
  headlineOverride,
  returnFocusRef,
}: PreviewViewDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onCloseEvent = () => {
      onClose();
      returnFocusRef.current?.focus();
    };
    dialog.addEventListener("close", onCloseEvent);
    return () => dialog.removeEventListener("close", onCloseEvent);
  }, [onClose, returnFocusRef]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="fixed inset-0 m-auto w-[min(920px,94vw)] max-h-[min(88vh,860px)] rounded-xl border border-border bg-card p-0 text-foreground shadow-xl backdrop:bg-black/45"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="flex max-h-[min(88vh,860px)] flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h3 id={titleId} className="text-sm font-semibold">
            Platform preview
          </h3>
          <Button
            type="button"
            variant="outline"
            className="h-8"
            onClick={onClose}
          >
            Close
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-auto bg-muted/20 p-4">
          <div className="mx-auto h-[min(70vh,640px)] w-full max-w-[720px] overflow-hidden rounded-xl border border-border bg-card">
            <PlatformPreviewFrame
              channel={channel}
              pkg={pkg}
              brandName={brandName}
              headlineOverride={headlineOverride}
            />
          </div>
        </div>
      </div>
    </dialog>
  );
}
