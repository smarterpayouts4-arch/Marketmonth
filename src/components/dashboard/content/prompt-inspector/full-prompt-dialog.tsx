"use client";

import { useEffect, useId, useRef } from "react";

import { Button } from "@/components/ui/button";

type FullPromptDialogProps = {
  open: boolean;
  prompt: string;
  onClose: () => void;
  onCopy: () => void;
  returnFocusRef: React.RefObject<HTMLButtonElement | null>;
};

export function FullPromptDialog({
  open,
  prompt,
  onClose,
  onCopy,
  returnFocusRef,
}: FullPromptDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
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

  function selectAll() {
    const pre = dialogRef.current?.querySelector("pre");
    if (!pre) return;
    const range = document.createRange();
    range.selectNodeContents(pre);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="fixed inset-0 m-auto w-[min(720px,92vw)] max-h-[min(80vh,720px)] rounded-xl border border-border bg-card p-0 text-foreground shadow-xl backdrop:bg-black/40"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="flex h-full max-h-[min(80vh,720px)] flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h3 id={titleId} className="text-sm font-semibold">
            Full prompt
          </h3>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" className="h-8" onClick={selectAll}>
              Select all
            </Button>
            <Button type="button" variant="outline" className="h-8" onClick={onCopy}>
              Copy
            </Button>
            <Button type="button" variant="outline" className="h-8" onClick={onClose}>
              Close
            </Button>
          </div>
        </header>
        <pre className="min-h-0 flex-1 overflow-auto px-4 py-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
          {prompt}
        </pre>
      </div>
    </dialog>
  );
}
