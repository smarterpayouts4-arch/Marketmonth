"use client";

import { cn } from "@/lib/utils";

/** Stage tabs: Directions → Atom → YouTube Short → Prompt. */
export const PROMPT_INSPECTOR_TABS = [
  "directions",
  "atom",
  "youtube_short",
  "prompt",
] as const;

export type PromptInspectorTab = (typeof PROMPT_INSPECTOR_TABS)[number];

const TAB_LABELS: Record<PromptInspectorTab, string> = {
  directions: "Directions",
  atom: "Atom",
  youtube_short: "YouTube Short",
  prompt: "Prompt",
};

type PromptInspectorTabsProps = {
  active: PromptInspectorTab;
  onChange: (tab: PromptInspectorTab) => void;
};

export function PromptInspectorTabs({
  active,
  onChange,
}: PromptInspectorTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Prompt Inspector sections"
      className="flex flex-wrap gap-0.5"
    >
      {PROMPT_INSPECTOR_TABS.map((tab) => {
        const selected = active === tab;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            id={`inspector-tab-${tab}`}
            aria-selected={selected}
            aria-controls={`inspector-panel-${tab}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              e.preventDefault();
              const idx = PROMPT_INSPECTOR_TABS.indexOf(tab);
              const next =
                e.key === "ArrowRight"
                  ? PROMPT_INSPECTOR_TABS[
                      (idx + 1) % PROMPT_INSPECTOR_TABS.length
                    ]
                  : PROMPT_INSPECTOR_TABS[
                      (idx - 1 + PROMPT_INSPECTOR_TABS.length) %
                        PROMPT_INSPECTOR_TABS.length
                    ];
              onChange(next);
              queueMicrotask(() => {
                document.getElementById(`inspector-tab-${next}`)?.focus();
              });
            }}
            className={cn(
              "rounded px-2 py-1 text-[11px] font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
              selected
                ? "bg-primary/10 text-foreground underline decoration-primary/70 decoration-2 underline-offset-4"
                : "text-text-secondary hover:bg-muted hover:text-foreground"
            )}
          >
            {TAB_LABELS[tab]}
          </button>
        );
      })}
    </div>
  );
}
