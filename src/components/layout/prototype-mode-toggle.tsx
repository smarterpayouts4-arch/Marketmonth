"use client";

import { usePrototypeMode, type PrototypeMode } from "@/lib/prototype-mode";
import { cn } from "@/lib/utils";

const options: { value: PrototypeMode; label: string }[] = [
  { value: "first-run", label: "First-run" },
  { value: "completed", label: "Completed brand" },
];

export function PrototypeModeToggle({ className }: { className?: string }) {
  const { mode, setMode } = usePrototypeMode();

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-xl border border-border bg-background p-1",
        className
      )}
      role="group"
      aria-label="Prototype mode"
    >
      {options.map((option) => {
        const active = mode === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setMode(option.value)}
            className={cn(
              "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-subtle text-primary-dark"
                : "text-text-secondary hover:text-foreground"
            )}
            aria-pressed={active}
            suppressHydrationWarning
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
