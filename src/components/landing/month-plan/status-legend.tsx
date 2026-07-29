import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

import { STATUS_METADATA, type ContentStatus } from "./types";

const DOT_TONE: Record<ContentStatus, string> = {
  planned: "border-primary bg-primary text-primary-foreground",
  scheduled: "border-warning bg-warning/15 text-warning",
  published: "border-success bg-success text-primary-foreground",
  draft: "border-border bg-background text-text-muted",
  empty: "border-border bg-background text-text-muted",
};

type StatusDotProps = {
  status: ContentStatus;
  className?: string;
};

/** Small status indicator used on each daily card — filled + checked for
 * "planned", outline for anything not yet committed. */
export function StatusDot({ status, className }: StatusDotProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-full border-2",
        DOT_TONE[status],
        className
      )}
    >
      {status === "planned" || status === "published" ? (
        <Check className="size-2.5" strokeWidth={3} />
      ) : null}
    </span>
  );
}

const LEGEND_ORDER: ContentStatus[] = [
  "planned",
  "scheduled",
  "published",
  "draft",
  "empty",
];

/** Status legend derived from `STATUS_METADATA` — the real status model,
 * not a hardcoded caption. */
export function StatusLegend({ className }: { className?: string }) {
  return (
    <ul
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-secondary",
        className
      )}
    >
      {LEGEND_ORDER.map((status) => (
        <li key={status} className="flex items-center gap-1.5">
          <StatusDot status={status} />
          <span>{STATUS_METADATA[status].label}</span>
        </li>
      ))}
    </ul>
  );
}
