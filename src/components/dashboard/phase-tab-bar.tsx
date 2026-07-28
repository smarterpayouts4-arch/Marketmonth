"use client";

import { Check, Crosshair } from "lucide-react";

import {
  homePhases,
  type DashboardPhase,
  type HomePhaseStatus,
} from "@/data/mock-brand";
import { cn } from "@/lib/utils";

type PhaseTabBarProps = {
  activePhase: DashboardPhase;
  statuses: Record<DashboardPhase, HomePhaseStatus>;
  onChange: (phase: DashboardPhase) => void;
};

export function PhaseTabBar({
  activePhase,
  statuses,
  onChange,
}: PhaseTabBarProps) {
  return (
    <nav aria-label="Marketing month progress" className="w-full py-0.5">
      <ol className="flex items-center gap-0">
        {homePhases.map((phase, index) => {
          const active = phase.id === activePhase;
          const status = statuses[phase.id];
          const complete = status === "complete";
          const isFirst = index === 0;

          return (
            <li
              key={phase.id}
              className={cn(
                "flex min-w-0 items-center",
                index < homePhases.length - 1 ? "flex-1" : "shrink-0"
              )}
            >
              <button
                type="button"
                aria-current={active ? "step" : undefined}
                onClick={() => onChange(phase.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-1 py-0.5 text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  active
                    ? "text-foreground"
                    : "text-text-muted hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border text-[10px]",
                    active &&
                      "border-primary bg-primary text-primary-foreground",
                    !active &&
                      complete &&
                      "border-primary bg-primary text-primary-foreground",
                    !active &&
                      !complete &&
                      "border-border bg-card text-text-muted"
                  )}
                  aria-hidden
                >
                  {isFirst && active ? (
                    <Crosshair className="size-3.5" />
                  ) : complete && !active ? (
                    <Check className="size-3.5" aria-hidden />
                  ) : (
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        active || complete ? "bg-primary-foreground" : "bg-current"
                      )}
                    />
                  )}
                </span>
                <span
                  className={cn(
                    "hidden text-sm font-medium sm:inline",
                    active && "font-semibold text-foreground"
                  )}
                >
                  {phase.label}
                </span>
              </button>

              {index < homePhases.length - 1 ? (
                <span
                  className={cn(
                    "mx-2 h-px min-w-[1.5rem] flex-1",
                    complete || active ? "bg-primary/40" : "bg-border"
                  )}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
