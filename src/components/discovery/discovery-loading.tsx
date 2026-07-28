"use client";

import { Check, Circle, LoaderCircle } from "lucide-react";

import type { StageView } from "@/components/discovery/types";
import { cn } from "@/lib/utils";

type DiscoveryLoadingProps = {
  stages: StageView[];
  title?: string;
};

export function DiscoveryLoading({
  stages,
  title = "Analyzing your website…",
}: DiscoveryLoadingProps) {
  return (
    <div className="flex h-full min-h-0 flex-col animate-fade-in">
      <div className="shrink-0">
        <p className="font-display text-[1.05rem] font-semibold tracking-[-0.02em] text-foreground">
          {title}
        </p>
        <p className="mt-1 text-sm text-text-secondary">
          Reading your site and building a brand profile.
        </p>
      </div>
      <ul className="mt-5 shrink-0 space-y-2">
        {stages.map((stage, index) => {
          const done = stage.status === "complete";
          const active = stage.status === "active";
          return (
            <li
              key={stage.id}
              style={{ animationDelay: `${index * 45}ms` }}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm",
                done && "text-foreground animate-rise",
                active && "bg-primary/5 text-primary animate-soft-pulse",
                !done && !active && "text-text-muted animate-rise"
              )}
            >
              <span className="flex size-5 shrink-0 items-center justify-center">
                {done ? (
                  <Check
                    className="size-4 text-primary animate-pop-in"
                    aria-hidden
                  />
                ) : active ? (
                  <LoaderCircle
                    className="size-4 animate-spin text-primary"
                    aria-hidden
                  />
                ) : (
                  <Circle className="size-3.5 text-border" aria-hidden />
                )}
              </span>
              {stage.label}
            </li>
          );
        })}
      </ul>
      <div className="min-h-0 flex-1" aria-hidden />
    </div>
  );
}
