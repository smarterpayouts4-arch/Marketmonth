"use client";

import type { ContentFormatPackage } from "@/brain/content-studio";
import { cn } from "@/lib/utils";

type StoryboardProps = {
  pkg: ContentFormatPackage | null;
  selectedSceneId: string | null;
  onSelectScene: (id: string) => void;
};

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
}

/** Scene card width from globals.css --studio-scene-card-w */
export function StudioStoryboard({
  pkg,
  selectedSceneId,
  onSelectScene,
}: StoryboardProps) {
  if (!pkg) return null;
  const scenes = [...pkg.scenes].sort((a, b) => a.order - b.order);

  return (
    <div className="studio-storyboard" data-testid="studio-storyboard">
      <p className="mb-1.5 px-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-text-muted">
        Storyboard
      </p>
      <div className="studio-storyboard__track">
        {scenes.map((s, i) => {
          const selected = s.id === selectedSceneId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelectScene(s.id)}
              className={cn(
                "studio-storyboard__card",
                !selected && "hover:border-primary/35"
              )}
              data-selected={selected ? "true" : "false"}
              data-testid={`storyboard-scene-${s.id}`}
            >
              <div className="relative min-h-0 flex-1 aspect-[16/9] bg-gradient-to-br from-subtle via-muted to-primary/20">
                <span className="absolute bottom-1 left-1 flex h-4 min-w-4 items-center justify-center rounded bg-foreground/55 px-1 text-[10px] font-semibold text-background">
                  {i + 1}
                </span>
                <span className="absolute right-1 bottom-1 rounded bg-foreground/55 px-1 py-0.5 text-[9px] font-medium tabular-nums text-background">
                  {formatClock(s.durationSeconds)}
                </span>
              </div>
              <div className="shrink-0 bg-card px-1.5 py-1">
                <p className="line-clamp-2 text-[10px] leading-snug text-text-secondary">
                  {s.onScreenText || s.narration.slice(0, 48)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
