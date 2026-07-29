import type { ContentPillar } from "@/lib/discovery/discovery-narrative.schema";
import { cn } from "@/lib/utils";

export function PillarsList({
  pillars,
  selectedId,
  onSelect,
  selectable,
}: {
  pillars: ContentPillar[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  selectable?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold tracking-[0.06em] text-text-muted uppercase">
        Content pillars
      </p>
      <ul className="flex flex-col gap-1.5">
        {pillars.map((pillar) => {
          const selected = selectedId === pillar.id;
          const Tag = selectable ? "button" : "li";
          return (
            <Tag
              key={pillar.id}
              type={selectable ? "button" : undefined}
              onClick={selectable && onSelect ? () => onSelect(pillar.id) : undefined}
              aria-pressed={selectable ? selected : undefined}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-left",
                selectable
                  ? selected
                    ? "border-primary bg-primary/5 shadow-soft"
                    : "border-border hover:border-border"
                  : "border-border/70 bg-background/60"
              )}
            >
              <span className="block text-sm font-semibold text-foreground">
                {pillar.name}
              </span>
              <span className="mt-0.5 block text-xs leading-snug text-text-secondary">
                {pillar.description}
              </span>
            </Tag>
          );
        })}
      </ul>
    </div>
  );
}
