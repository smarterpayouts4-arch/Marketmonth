"use client";

import { Captions, Maximize2, Settings2 } from "lucide-react";

import type { ContentFormatPackage } from "@/brain/content-studio";
import { cn } from "@/lib/utils";

type PreviewCanvasProps = {
  pkg: ContentFormatPackage | null;
  selectedSceneId: string | null;
};

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, "0")}`;
}

/** Preview band/stage/frame layout from globals.css `.studio-preview-*` */
export function StudioPreviewCanvas({
  pkg,
  selectedSceneId,
}: PreviewCanvasProps) {
  const scene =
    pkg?.scenes.find((s) => s.id === selectedSceneId) ?? pkg?.scenes[0];
  const isShort = pkg?.formatId === "youtube_short";
  const headline =
    scene?.onScreenText?.trim() ||
    (pkg && "hook" in pkg
      ? pkg.hook
      : pkg && "openingHook" in pkg
        ? pkg.openingHook
        : "Visual preview");
  const duration = pkg ? Math.round(pkg.durationSeconds) : 0;

  return (
    <div
      className="studio-preview-band"
      data-testid="studio-preview-canvas"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/50 px-2.5 py-1">
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-muted">
          Visual preview · draft
        </p>
        <p className="text-[10px] tabular-nums text-text-muted">
          {pkg?.aspectRatio ?? "—"} · {formatClock(duration)}
          {pkg?.status === "research_required" ? " · research" : ""}
        </p>
      </div>

      <div className="studio-preview-stage">
        <div
          className={cn(
            "studio-preview-frame",
            isShort
              ? "studio-preview-frame--short"
              : "studio-preview-frame--video"
          )}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2.5 text-center">
            <p className="text-[8px] uppercase tracking-[0.16em] text-white/55">
              {pkg?.formatId === "youtube_video"
                ? "YouTube Video"
                : "YouTube Short"}
            </p>
            <p className="max-w-[94%] line-clamp-3 font-heading text-xs font-semibold leading-snug tracking-tight sm:text-sm">
              {headline}
            </p>
            <p className="max-w-[92%] line-clamp-2 text-[10px] leading-relaxed text-white/75">
              {scene?.narration
                ? scene.narration
                : "Select a scene to preview narration."}
            </p>
            {scene?.visualPrompt ? (
              <p
                className="mt-1 max-w-[94%] line-clamp-2 text-[9px] leading-snug text-white/50"
                data-testid="studio-preview-scene-visual"
              >
                Visual: {scene.visualPrompt}
              </p>
            ) : pkg?.imagePrompt ? (
              <p
                className="mt-1 max-w-[94%] line-clamp-2 text-[9px] leading-snug text-white/50"
                data-testid="studio-preview-image-prompt"
              >
                Visual: {pkg.imagePrompt}
              </p>
            ) : null}
            {isShort && scene?.assetType ? (
              <p
                className="text-[9px] uppercase tracking-[0.12em] text-white/40"
                data-testid="studio-preview-scene-asset-type"
              >
                {scene.assetType}
              </p>
            ) : null}
            {pkg?.formatId === "youtube_short" && pkg.voiceoverPrompt ? (
              <p
                className="max-w-[94%] line-clamp-1 text-[9px] leading-snug text-white/40"
                data-testid="studio-preview-voiceover-prompt"
              >
                VO: {pkg.voiceoverPrompt}
              </p>
            ) : null}
            {pkg?.formatId === "youtube_short" && pkg.script ? (
              <p
                className="max-w-[94%] line-clamp-1 text-[9px] leading-snug text-white/40"
                data-testid="studio-preview-script"
              >
                Script: {pkg.script}
              </p>
            ) : null}
          </div>
          <div className="absolute right-1.5 bottom-7 left-1.5 h-0.5 overflow-hidden rounded-full bg-white/20">
            <div className="h-full w-[18%] rounded-full bg-white/80" />
          </div>
          <div className="absolute right-0 bottom-0 left-0 flex items-center gap-1 bg-black/40 px-1.5 py-1 text-[9px] text-white/85">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/15 text-[8px]">
              ▶
            </span>
            <span className="tabular-nums">
              {scene
                ? `0:02 / ${formatClock(scene.durationSeconds)}`
                : `0:00 / ${formatClock(duration)}`}
            </span>
            <span className="ml-auto flex items-center gap-1 text-white/70">
              <Captions className="h-2.5 w-2.5" aria-hidden />
              <Settings2 className="h-2.5 w-2.5" aria-hidden />
              <Maximize2 className="h-2.5 w-2.5" aria-hidden />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
