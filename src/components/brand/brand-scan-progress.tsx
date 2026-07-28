"use client";

import { useEffect, useState } from "react";
import { Check, LoaderCircle } from "lucide-react";

import { scanSteps } from "@/data/mock-brand";
import { cn } from "@/lib/utils";

type BrandScanProgressProps = {
  website: string;
  onComplete: () => void;
};

export function BrandScanProgress({
  website,
  onComplete,
}: BrandScanProgressProps) {
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    let step = 0;
    const timer = window.setInterval(() => {
      step += 1;
      setCompletedCount(step);
      if (step >= scanSteps.length) {
        window.clearInterval(timer);
        window.setTimeout(() => onComplete(), 350);
      }
    }, 520);

    return () => window.clearInterval(timer);
  }, [onComplete]);

  const percent = Math.min(
    100,
    Math.round((completedCount / scanSteps.length) * 100)
  );

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
            Learning your brand
          </p>
          <h2 className="mt-2 text-section">Analyzing {website}</h2>
        </div>
        <p className="text-sm font-semibold text-primary">{percent}% complete</p>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>

      <ul className="mt-8 space-y-3">
        {scanSteps.map((step, index) => {
          const complete = index < completedCount;
          const active = index === completedCount;
          return (
            <li
              key={step}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                active && "bg-subtle",
                complete && "opacity-90"
              )}
            >
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full border",
                  complete && "border-success bg-success text-white",
                  active && "border-primary text-primary",
                  !complete && !active && "border-border text-text-muted"
                )}
              >
                {complete ? (
                  <Check className="size-3.5" aria-hidden />
                ) : active ? (
                  <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <span className="size-1.5 rounded-full bg-current" />
                )}
              </span>
              <span
                className={cn(
                  "text-sm font-medium",
                  complete || active ? "text-foreground" : "text-text-muted"
                )}
              >
                {step}
                {active ? "..." : ""}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
