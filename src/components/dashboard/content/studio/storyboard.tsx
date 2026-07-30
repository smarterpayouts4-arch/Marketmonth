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

/** Scene cards: width/aspect from globals.css `.studio-storyboard[data-format]` */
export function StudioStoryboard({
  pkg,
  selectedSceneId,
  onSelectScene,
}: StoryboardProps) {
  if (!pkg) return null;
  const scenes = [...pkg.scenes].sort((a, b) => a.order - b.order);
  const format = pkg.formatId === "youtube_short" ? "short" : "video";

  return (
    <div
      className="studio-storyboard"
      data-format={format}
      data-testid="studio-storyboard"
    >
      <p className="studio-storyboard__label">Storyboard</p>
      {pkg.formatId === "youtube_short" ? (
        <p
          className="line-clamp-2 text-[10px] leading-snug text-text-muted"
          data-testid="studio-storyboard-script"
        >
          {pkg.script}
        </p>
      ) : null}
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
              <div className="studio-storyboard__thumb">
                <span className="studio-storyboard__badge studio-storyboard__badge--order">
                  {i + 1}
                </span>
                <span className="studio-storyboard__badge studio-storyboard__badge--time">
                  {formatClock(s.durationSeconds)}
                </span>
              </div>
              <div className="studio-storyboard__caption">
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
