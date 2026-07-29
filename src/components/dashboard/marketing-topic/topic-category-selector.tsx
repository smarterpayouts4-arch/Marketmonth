"use client";

import { Check } from "lucide-react";

import {
  DEFAULT_TOPIC_CATEGORY_OPTIONS,
  TOPIC_CATEGORY_HINTS,
  TOPIC_CATEGORY_LABELS,
  type TopicCategoryId,
} from "@/brain/content/topic-category";
import { cn } from "@/lib/utils";

import { TOPIC_CATEGORY_LEGEND } from "./copy";

type TopicCategorySelectorProps = {
  value: TopicCategoryId | null;
  onChange: (value: TopicCategoryId | null) => void;
  disabled?: boolean;
  /** Denser packing once directions exist. */
  compact?: boolean;
  /** Inline validation near chips (e.g. Idea Lab objective gate). */
  error?: string | null;
};

export function TopicCategorySelector({
  value,
  onChange,
  disabled,
  compact = false,
  error = null,
}: TopicCategorySelectorProps) {
  return (
    <fieldset className="min-w-0" disabled={disabled}>
      <legend
        className={
          compact
            ? "text-[10px] font-semibold tracking-[0.12em] text-text-muted uppercase"
            : "text-[11px] font-semibold tracking-[0.12em] text-text-muted uppercase"
        }
      >
        {TOPIC_CATEGORY_LEGEND}
      </legend>
      <div
        role="radiogroup"
        aria-label="Topic category"
        aria-invalid={error ? true : undefined}
        className={compact ? "mt-1 flex flex-wrap gap-1" : "mt-1.5 flex flex-wrap gap-1.5"}
      >
        {DEFAULT_TOPIC_CATEGORY_OPTIONS.map((focus) => {
          const selected = value === focus;
          return (
            <button
              key={focus}
              type="button"
              role="radio"
              aria-checked={selected}
              title={TOPIC_CATEGORY_HINTS[focus]}
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
              {TOPIC_CATEGORY_LABELS[focus]}
            </button>
          );
        })}
      </div>
      {error ? (
        <p
          className="mt-1.5 text-xs text-red-700"
          role="alert"
          data-testid="topic-category-error"
        >
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
