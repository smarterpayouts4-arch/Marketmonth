"use client";

import { Check } from "lucide-react";

import {
  DEFAULT_MARKETING_FOCUS_OPTIONS,
  MARKETING_FOCUS_HINTS,
  MARKETING_FOCUS_LABELS,
  type MarketingFocus,
} from "@/brain/content/marketing-focus";
import { cn } from "@/lib/utils";

import { MARKETING_FOCUS_LEGEND } from "./copy";

type MarketingFocusSelectorProps = {
  value: MarketingFocus | null;
  onChange: (value: MarketingFocus | null) => void;
  disabled?: boolean;
  /** Denser packing once directions exist. */
  compact?: boolean;
  /** Inline validation near chips (e.g. Idea Lab objective gate). */
  error?: string | null;
};

export function MarketingFocusSelector({
  value,
  onChange,
  disabled,
  compact = false,
  error = null,
}: MarketingFocusSelectorProps) {
  return (
    <fieldset className="min-w-0" disabled={disabled}>
      <legend
        className={
          compact
            ? "text-[10px] font-semibold tracking-[0.12em] text-text-muted uppercase"
            : "text-[11px] font-semibold tracking-[0.12em] text-text-muted uppercase"
        }
      >
        {MARKETING_FOCUS_LEGEND}
      </legend>
      <div
        role="radiogroup"
        aria-label="Marketing focus"
        aria-invalid={error ? true : undefined}
        className={compact ? "mt-1 flex flex-wrap gap-1" : "mt-1.5 flex flex-wrap gap-1.5"}
      >
        {DEFAULT_MARKETING_FOCUS_OPTIONS.map((focus) => {
          const selected = value === focus;
          return (
            <button
              key={focus}
              type="button"
              role="radio"
              aria-checked={selected}
              title={MARKETING_FOCUS_HINTS[focus]}
              disabled={disabled}
              onClick={() => onChange(selected ? null : focus)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border font-medium transition",
                compact
                  ? "min-h-7 px-2 py-0.5 text-[11px]"
                  : "min-h-8 px-2.5 py-1 text-xs sm:text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                selected
                  ? "border-primary bg-primary/10 text-primary-dark"
                  : "border-border bg-card text-foreground hover:border-primary/40",
                disabled && "cursor-not-allowed opacity-60"
              )}
            >
              {selected ? (
                <Check className="size-3 shrink-0" aria-hidden />
              ) : (
                <span
                  className="size-1.5 shrink-0 rounded-full bg-current opacity-30"
                  aria-hidden
                />
              )}
              {MARKETING_FOCUS_LABELS[focus]}
            </button>
          );
        })}
      </div>
      {error ? (
        <p
          className="mt-1.5 text-xs text-red-700"
          role="alert"
          data-testid="marketing-focus-error"
        >
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
