"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

type GlobalVisualStyleProps = {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
};

export function GlobalVisualStyleField({
  value,
  onChange,
  readOnly = false,
}: GlobalVisualStyleProps) {
  const [open, setOpen] = useState(Boolean(value.trim()));

  return (
    <div
      className="rounded-xl border border-border/60 bg-card/40"
      data-testid="studio-global-visual-style"
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        data-testid="studio-global-visual-style-toggle"
      >
        <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-text-muted">
          Global Visual Style
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-text-muted transition-transform",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="space-y-1 border-t border-border/50 px-2.5 py-2">
          <p className="text-[10px] text-text-muted">
            Shared look for the whole Short — mood, palette, lighting, character,
            9:16 continuity.
          </p>
          <textarea
            className="min-h-[72px] w-full resize-y rounded-lg border border-border bg-background px-2 py-1.5 text-xs leading-relaxed text-foreground disabled:opacity-70"
            value={value}
            readOnly={readOnly}
            disabled={readOnly}
            maxLength={2000}
            placeholder="e.g. Modern editorial realism, dark green and cream brand palette…"
            onChange={(e) => onChange(e.target.value)}
            data-testid="studio-global-visual-style-input"
          />
        </div>
      ) : null}
    </div>
  );
}
