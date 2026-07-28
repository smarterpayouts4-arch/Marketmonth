"use client";

import { CHANNEL_FORMAT_LABELS } from "./studio-channels";
import type { ContentChannel } from "./types";
import { cn } from "@/lib/utils";

type ContentFormatTabsProps = {
  channel: ContentChannel;
  formats: readonly string[];
  active: string;
  onChange: (format: string) => void;
};

export function ContentFormatTabs({
  channel,
  formats,
  active,
  onChange,
}: ContentFormatTabsProps) {
  const labels = CHANNEL_FORMAT_LABELS[channel];

  return (
    <div
      role="tablist"
      aria-label={`${channel} formats`}
      className="inline-flex flex-wrap gap-0.5 rounded-md border border-border bg-muted/40 p-0.5"
    >
      {formats.map((format) => {
        const selected = active === format;
        const label = labels[format] ?? format;
        return (
          <button
            key={format}
            type="button"
            role="tab"
            id={`format-tab-${channel}-${format}`}
            aria-selected={selected}
            aria-controls="channel-preview-panel"
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(format)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              e.preventDefault();
              const idx = formats.indexOf(format);
              const next =
                e.key === "ArrowRight"
                  ? formats[(idx + 1) % formats.length]
                  : formats[(idx - 1 + formats.length) % formats.length];
              onChange(next);
            }}
            className={cn(
              "rounded px-2.5 py-1 text-[11px] font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
              selected
                ? "bg-card text-foreground shadow-sm ring-1 ring-primary/40"
                : "text-text-secondary hover:text-foreground"
            )}
          >
            {label}
            {selected ? <span className="sr-only"> (selected)</span> : null}
          </button>
        );
      })}
    </div>
  );
}
