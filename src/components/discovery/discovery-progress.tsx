"use client";

import { Check } from "lucide-react";

import type { DiscoveryStatus } from "@/components/discovery/types";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "discover", label: "Discover" },
  { id: "priorities", label: "Priorities" },
  { id: "strategy", label: "Strategy" },
  { id: "plan", label: "Plan" },
] as const;

type StepState = "complete" | "current" | "future";

function stepStates(status: DiscoveryStatus): StepState[] {
  switch (status) {
    case "empty":
    case "loading":
    case "error":
      return ["current", "future", "future", "future"];
    case "result":
      return ["complete", "current", "future", "future"];
    case "generating_strategy":
      return ["complete", "complete", "current", "future"];
    case "strategy":
      return ["complete", "complete", "complete", "future"];
    default:
      return ["current", "future", "future", "future"];
  }
}

type DiscoveryProgressProps = {
  status: DiscoveryStatus;
};

export function DiscoveryProgress({ status }: DiscoveryProgressProps) {
  const states = stepStates(status);

  return (
    <nav
      aria-label="Discovery progress"
      className="shrink-0 border-b border-border/70 px-3 py-3 sm:px-5"
    >
      <ol className="grid grid-cols-4 gap-0">
        {STEPS.map((step, index) => {
          const state = states[index];
          const isCurrent = state === "current";
          return (
            <li
              key={step.id}
              className="relative flex flex-col items-center"
              aria-current={isCurrent ? "step" : undefined}
            >
              {index < STEPS.length - 1 ? (
                <span
                  aria-hidden
                  className="pointer-events-none absolute top-3 left-1/2 z-0 flex w-full items-center justify-center text-[11px] text-text-muted"
                >
                  →
                </span>
              ) : null}
              <span
                className={cn(
                  "relative z-10 flex size-6 items-center justify-center rounded-full text-[11px] font-semibold transition-colors",
                  state === "complete" && "bg-primary text-primary-foreground",
                  state === "current" && "bg-primary text-primary-foreground",
                  state === "future" &&
                    "border border-border bg-background text-text-muted"
                )}
              >
                {state === "complete" ? (
                  <Check className="size-3.5" aria-hidden />
                ) : (
                  <span aria-hidden>{index + 1}</span>
                )}
              </span>
              <span
                className={cn(
                  "mt-1 w-full text-center text-[11px] font-medium sm:text-xs",
                  state === "complete" || isCurrent
                    ? "text-foreground"
                    : "text-text-muted"
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
