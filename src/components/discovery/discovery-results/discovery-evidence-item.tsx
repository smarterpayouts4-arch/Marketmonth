"use client";

import {
  CheckCircle2,
  ChevronDown,
  Layers3,
  Shield,
  Sparkles,
} from "lucide-react";

import type { DiscoveryEvidenceItem as EvidenceItem } from "@/components/discovery/activation";
import { cn } from "@/lib/utils";

function ItemIcon({
  kind,
  index,
}: {
  kind: EvidenceItem["kind"];
  index: number;
}) {
  const className = "size-3.5 shrink-0 text-primary";
  if (kind === "recommended") return <Sparkles className={className} aria-hidden />;
  if (kind === "inferred" || index === 1) {
    return <Layers3 className={className} aria-hidden />;
  }
  if (index >= 2) return <Shield className={className} aria-hidden />;
  return <CheckCircle2 className={className} aria-hidden />;
}

type Props = {
  item: EvidenceItem;
  index: number;
  expanded: boolean;
  onToggle: () => void;
};

export function DiscoveryEvidenceItem({
  item,
  index,
  expanded,
  onToggle,
}: Props) {
  const panelId = `${item.id}-panel`;
  const buttonId = `${item.id}-button`;

  return (
    <div
      className={cn(
        "rounded-xl border transition-colors",
        expanded
          ? "border-primary/25 bg-primary/[0.04]"
          : "border-border/80 bg-background/90 hover:border-border"
      )}
    >
      <button
        id={buttonId}
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left"
      >
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <ItemIcon kind={item.kind} index={index} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[13px] font-semibold leading-snug text-foreground sm:text-sm">
                {item.title}
              </span>
              {item.tag ? (
                <span className="rounded-full bg-subtle px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-text-muted">
                  {item.tag}
                </span>
              ) : null}
            </span>
            <ChevronDown
              aria-hidden
              className={cn(
                "mt-0.5 size-3.5 shrink-0 text-text-muted transition-transform duration-200 motion-reduce:transition-none",
                expanded && "rotate-180"
              )}
            />
          </span>
          <span className="mt-0.5 line-clamp-2 block text-[12.5px] leading-snug text-text-secondary sm:text-[13px]">
            {item.summary}
          </span>
        </span>
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
          expanded
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-2 border-t border-border/60 px-3 pb-3 pt-2.5 sm:pl-[2.75rem]">
            {item.detail ? (
              <p className="text-[13px] leading-snug text-foreground">
                {item.detail}
              </p>
            ) : null}
            {item.supportingPoints.length > 0 ? (
              <div>
                <p className="text-[10px] font-semibold tracking-[0.08em] text-text-muted uppercase">
                  Why we believe this
                </p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[12.5px] leading-snug text-text-secondary">
                  {item.supportingPoints.map((point) => (
                    <li key={point.slice(0, 48)}>{point}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="text-[12px] text-text-muted">
              Source: {item.sourceLabel}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
