"use client";

import { useState } from "react";

import {
  YOUTUBE_SHORT_SCENE_COUNT_MAX,
  YOUTUBE_SHORT_SCENE_COUNT_MIN,
} from "@/brain/content-studio";
import { Button } from "@/components/ui/button";

const QUICK_COUNTS = [3, 5, 7, 9, 12] as const;

type SceneSetupProps = {
  sceneCount: number;
  onApplyCount: (count: number) => void | Promise<void>;
  onAddScene: () => void | Promise<void>;
  disabled?: boolean;
};

/** Remount with key={sceneCount} when the server count changes. */
export function SceneSetup({
  sceneCount,
  onApplyCount,
  onAddScene,
  disabled = false,
}: SceneSetupProps) {
  const [draftCount, setDraftCount] = useState(String(sceneCount));

  const parsed = Number.parseInt(draftCount, 10);
  const valid =
    Number.isInteger(parsed) &&
    parsed >= YOUTUBE_SHORT_SCENE_COUNT_MIN &&
    parsed <= YOUTUBE_SHORT_SCENE_COUNT_MAX;
  const canApply = valid && parsed >= sceneCount && parsed !== sceneCount;

  return (
    <div
      className="space-y-1.5 rounded-xl border border-border/60 bg-card/40 px-2.5 py-2"
      data-testid="studio-scene-setup"
    >
      <div className="flex flex-wrap items-center gap-2">
        <label
          className="text-[10px] font-medium uppercase tracking-[0.1em] text-text-muted"
          htmlFor="studio-scene-count"
        >
          Scenes
        </label>
        <input
          id="studio-scene-count"
          type="number"
          min={YOUTUBE_SHORT_SCENE_COUNT_MIN}
          max={YOUTUBE_SHORT_SCENE_COUNT_MAX}
          className="h-7 w-14 rounded-lg border border-border bg-background px-2 text-xs tabular-nums"
          value={draftCount}
          disabled={disabled}
          onChange={(e) => setDraftCount(e.target.value)}
          data-testid="studio-scene-count-input"
        />
        <Button
          type="button"
          variant="outline"
          className="h-7 rounded-lg px-2.5 text-[11px]"
          disabled={disabled || !canApply}
          onClick={() => {
            if (canApply) void onApplyCount(parsed);
          }}
          data-testid="studio-scene-count-apply"
          title={
            valid && parsed < sceneCount
              ? "Decreasing via Apply is not supported — remove one scene at a time"
              : "Create or expand empty scene cards"
          }
        >
          Apply
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-7 rounded-lg px-2.5 text-[11px]"
          disabled={disabled || sceneCount >= YOUTUBE_SHORT_SCENE_COUNT_MAX}
          onClick={() => {
            void onAddScene();
          }}
          data-testid="studio-add-scene"
        >
          Add Scene
        </Button>
      </div>
      <div
        className="flex flex-wrap items-center gap-1"
        data-testid="studio-scene-count-quick"
      >
        <span className="text-[10px] text-text-muted">Quick:</span>
        {QUICK_COUNTS.map((n) => (
          <button
            key={n}
            type="button"
            className="h-6 min-w-6 rounded-md border border-border/70 px-1.5 text-[10px] text-text-secondary enabled:hover:bg-card disabled:opacity-40"
            disabled={disabled || n < sceneCount}
            data-active={n === sceneCount ? "true" : "false"}
            onClick={() => {
              setDraftCount(String(n));
              if (n > sceneCount) void onApplyCount(n);
            }}
            data-testid={`studio-scene-count-quick-${n}`}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-text-muted" data-testid="studio-scene-setup-hint">
        {YOUTUBE_SHORT_SCENE_COUNT_MIN}–{YOUTUBE_SHORT_SCENE_COUNT_MAX} scenes.
        Apply only increases count; remove one scene with confirmation.
      </p>
    </div>
  );
}
