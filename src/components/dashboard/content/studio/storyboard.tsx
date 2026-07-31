"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import {
  YOUTUBE_SHORT_SCENE_COUNT_MAX,
  YOUTUBE_SHORT_SCENE_COUNT_MIN,
  type ContentFormatPackage,
} from "@/brain/content-studio";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { StudioPromptMode } from "../hooks/use-atom-content-studio";

type StoryboardProps = {
  pkg: ContentFormatPackage | null;
  selectedSceneId: string | null;
  onSelectScene: (id: string) => void;
  /** Manual Short only — storyboard owns Add / Remove. */
  promptMode?: StudioPromptMode;
  onAddScene?: () => void | Promise<void>;
  onRemoveSelectedScene?: () => void | Promise<void>;
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
  promptMode,
  onAddScene,
  onRemoveSelectedScene,
}: StoryboardProps) {
  const [removeConfirm, setRemoveConfirm] = useState(false);

  if (!pkg) return null;
  const scenes = [...pkg.scenes].sort((a, b) => a.order - b.order);
  const format = pkg.formatId === "youtube_short" ? "short" : "video";
  const showSceneControls =
    pkg.formatId === "youtube_short" &&
    promptMode === "manual" &&
    Boolean(onAddScene) &&
    Boolean(onRemoveSelectedScene);
  const canAdd = scenes.length < YOUTUBE_SHORT_SCENE_COUNT_MAX;
  const canRemove = scenes.length > YOUTUBE_SHORT_SCENE_COUNT_MIN;
  const selectedIndex = scenes.findIndex((s) => s.id === selectedSceneId);

  return (
    <div
      className="studio-storyboard"
      data-format={format}
      data-testid="studio-storyboard"
    >
      <div
        className="studio-storyboard__header"
        data-testid="studio-storyboard-header"
      >
        <p className="studio-storyboard__label">Storyboard</p>
        {showSceneControls ? (
          <div
            className="studio-storyboard__actions"
            data-testid="studio-storyboard-actions"
          >
            <Button
              type="button"
              variant="outline"
              className="h-7 rounded-lg px-2 text-[11px]"
              disabled={!canAdd}
              title={
                canAdd
                  ? "Add one empty scene"
                  : `Maximum ${YOUTUBE_SHORT_SCENE_COUNT_MAX} scenes`
              }
              onClick={() => {
                setRemoveConfirm(false);
                void onAddScene?.();
              }}
              data-testid="studio-add-scene"
            >
              <Plus className="mr-1 h-3 w-3" aria-hidden />
              Add Scene
            </Button>
            {!removeConfirm ? (
              <Button
                type="button"
                variant="outline"
                className="h-7 rounded-lg px-2 text-[11px] text-danger disabled:opacity-40"
                disabled={!canRemove || !selectedSceneId}
                title={
                  canRemove
                    ? "Remove the selected scene after confirmation"
                    : `At least ${YOUTUBE_SHORT_SCENE_COUNT_MIN} scenes must remain`
                }
                onClick={() => setRemoveConfirm(true)}
                data-testid="studio-remove-selected"
              >
                <Trash2 className="mr-1 h-3 w-3" aria-hidden />
                Remove Selected
              </Button>
            ) : (
              <div
                className="flex flex-wrap items-center gap-1"
                data-testid="studio-remove-scene-block"
              >
                <span className="text-[10px] text-foreground">
                  Remove scene{" "}
                  {selectedIndex >= 0 ? selectedIndex + 1 : "?"}?
                </span>
                <button
                  type="button"
                  className="h-7 rounded-md bg-danger px-2 text-[10px] font-medium text-white"
                  onClick={() => {
                    setRemoveConfirm(false);
                    void onRemoveSelectedScene?.();
                  }}
                  data-testid="studio-remove-scene-confirm"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  className="h-7 rounded-md border border-border px-2 text-[10px] text-text-secondary"
                  onClick={() => setRemoveConfirm(false)}
                  data-testid="studio-remove-scene-cancel"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {pkg.formatId === "youtube_short" && promptMode !== "manual" ? (
        <p
          className="studio-storyboard__script line-clamp-1 text-[10px] leading-snug text-text-muted"
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
              onClick={() => {
                setRemoveConfirm(false);
                onSelectScene(s.id);
              }}
              className={cn(
                "studio-storyboard__card",
                !selected && "hover:border-primary/35"
              )}
              data-selected={selected ? "true" : "false"}
              aria-pressed={selected}
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
                  {s.onScreenText?.trim()
                    ? s.onScreenText
                    : s.narration.slice(0, 48)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
