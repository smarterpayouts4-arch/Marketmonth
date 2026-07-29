import type { CadenceLevel, CadenceRecommendation } from "@/lib/discovery/discovery-narrative.schema";
import { cn } from "@/lib/utils";

const OPTIONS: Array<{ level: CadenceLevel; label: string; detail: string }> = [
  { level: "light", label: "Light", detail: "Two posts per week" },
  {
    level: "consistent",
    label: "Consistent",
    detail: "One post every two to three days",
  },
  { level: "active", label: "Active", detail: "Four to five posts per week" },
  { level: "daily", label: "Daily", detail: "Five to seven posts per week" },
];

export function CadenceRecommendationCard({
  cadence,
}: {
  cadence: CadenceRecommendation;
}) {
  return (
    <div className="rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5">
      <p className="text-[10px] font-semibold tracking-[0.1em] text-primary uppercase">
        Recommended by Market Month
      </p>
      <p className="mt-1 text-sm font-semibold text-foreground">{cadence.label}</p>
      <p className="mt-0.5 text-xs leading-snug text-text-secondary">
        {cadence.description}
      </p>
    </div>
  );
}

export function CadencePicker({
  recommended,
  selected,
  onSelect,
  disabled,
}: {
  recommended: CadenceLevel;
  selected?: CadenceLevel;
  onSelect: (level: CadenceLevel) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold tracking-[0.06em] text-text-muted uppercase">
        How consistently should we build your plan?
      </p>
      <div className="flex flex-col gap-1.5">
        {OPTIONS.map((opt) => {
          const isSelected = selected === opt.level;
          const isRec = recommended === opt.level;
          return (
            <button
              key={opt.level}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(opt.level)}
              aria-pressed={isSelected}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                isSelected
                  ? "border-primary bg-primary/5 shadow-soft"
                  : "border-border hover:border-border"
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {opt.label}
                </span>
                {isRec ? (
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-primary uppercase">
                    Recommended
                  </span>
                ) : null}
              </span>
              <span className="mt-0.5 block text-xs text-text-secondary">
                {opt.detail}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
