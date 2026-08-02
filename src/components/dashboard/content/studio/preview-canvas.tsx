"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Captions, Maximize2, Settings2, X } from "lucide-react";

import type { ContentFormatPackage } from "@/brain/content-studio";
import { cn } from "@/lib/utils";

import type {
  SceneEditFields,
  StudioPromptMode,
} from "../hooks/use-atom-content-studio";

import { SceneOnScreenOverlay } from "./preview-onscreen-overlay";

type PreviewCanvasProps = {
  pkg: ContentFormatPackage | null;
  selectedSceneId: string | null;
  /** Manual draft for selected Short scene — live overlay only; Save persists. */
  sceneEdits?: SceneEditFields;
  promptMode?: StudioPromptMode;
};

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, "0")}`;
}

/** Preview band/stage/frame layout from content-studio.css `.studio-preview-*` */
export function StudioPreviewCanvas({
  pkg,
  selectedSceneId,
  sceneEdits,
  promptMode,
}: PreviewCanvasProps) {
  const scene =
    pkg?.scenes.find((s) => s.id === selectedSceneId) ?? pkg?.scenes[0];
  const isShort = pkg?.formatId === "youtube_short";
  const stillUrl =
    scene && "render" in scene && scene.render?.assetUrl
      ? scene.render.assetUrl
      : null;
  const veoUrl =
    scene && "video" in scene && scene.video?.assetUrl
      ? scene.video.assetUrl
      : null;
  const voiceUrl =
    scene && "voice" in scene && scene.voice?.assetUrl
      ? scene.voice.assetUrl
      : null;
  const voiceDurationSeconds =
    scene && "voice" in scene ? scene.voice?.durationSeconds : undefined;
  const composedStatus =
    scene && "composedVideo" in scene ? scene.composedVideo?.status : undefined;
  const composedIsCurrent = composedStatus === "succeeded";
  const composedIsStale = composedStatus === "stale";
  const composedUrl =
    scene && "composedVideo" in scene && scene.composedVideo?.assetUrl
      ? scene.composedVideo.assetUrl
      : null;
  const composedDurationSeconds =
    scene && "composedVideo" in scene
      ? scene.composedVideo?.durationSeconds
      : undefined;

  /**
   * One vertical frame media priority for Shorts:
   * current composed MP4 → Veo motion → still.
   * Stale composed is NOT treated as final (shows still/Veo + updated OST).
   */
  const showingComposed = Boolean(composedUrl) && composedIsCurrent;
  const showingVeo = Boolean(veoUrl) && !showingComposed;
  const showingStill = Boolean(stillUrl) && !showingComposed && !showingVeo;
  const hasFrameMedia = showingComposed || showingVeo || showingStill;

  /** One string into SceneOnScreenOverlay — Manual draft else saved package. */
  const overlayText =
    promptMode === "manual"
      ? (sceneEdits?.onScreenText ?? scene?.onScreenText ?? "")
      : (scene?.onScreenText ?? "");
  const overlayTextTrimmed = overlayText.trim();
  /** DOM title when composed is not current — stale MP4 must not hide updated OST. */
  const showDomOverlay = Boolean(overlayTextTrimmed) && !showingComposed;
  const headline =
    overlayTextTrimmed ||
    (pkg && "hook" in pkg
      ? pkg.hook
      : pkg && "openingHook" in pkg
        ? pkg.openingHook
        : "Visual preview");
  const duration = pkg ? Math.round(pkg.durationSeconds) : 0;
  /** Zoom is keyed to the still URL — clears automatically when the still goes away. */
  const [zoomStillUrl, setZoomStillUrl] = useState<string | null>(null);
  const zoomed = Boolean(
    zoomStillUrl && stillUrl && zoomStillUrl === stillUrl && showingStill
  );
  const titleId = useId();

  useEffect(() => {
    if (!zoomed) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setZoomStillUrl(null);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [zoomed]);

  return (
    <div
      className="studio-preview-band"
      data-testid="studio-preview-canvas"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/50 px-2.5 py-1">
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-muted">
          Visual preview · draft
          {showingComposed
            ? composedDurationSeconds == null
              ? " · Scene MP4 · duration Unverified"
              : ` · Scene MP4 · ${composedDurationSeconds.toFixed(2)}s`
            : composedIsStale
              ? " · Outdated MP4 — Recompose required"
              : null}
        </p>
        <div className="flex items-center gap-2">
          {showingComposed && composedUrl ? (
            <a
              href={composedUrl}
              target="_blank"
              rel="noreferrer"
              download
              className="text-[10px] text-text-secondary underline-offset-2 hover:underline"
              data-testid="studio-preview-composed-download"
            >
              Download / open
            </a>
          ) : null}
          <p className="text-[10px] tabular-nums text-text-muted">
            {pkg?.aspectRatio ?? "—"} · {formatClock(duration)}
            {pkg?.status === "research_required" ? " · research" : ""}
          </p>
        </div>
      </div>

      {composedIsStale ? (
        <p
          className="border-b border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[10px] text-amber-800 dark:text-amber-200"
          data-testid="studio-preview-composed-stale-banner"
        >
          Outdated — Recompose required. Preview shows current still/motion with
          updated on-screen text; the previous MP4 is not treated as final.
        </p>
      ) : null}

      <div className="studio-preview-stage">
        <div
          className={cn(
            "studio-preview-frame",
            isShort
              ? "studio-preview-frame--short"
              : "studio-preview-frame--video"
          )}
          data-testid="studio-preview-frame"
          data-media={
            showingComposed
              ? "composed"
              : showingVeo
                ? "veo"
                : showingStill
                  ? "still"
                  : "empty"
          }
        >
          {showingComposed && composedUrl ? (
            <video
              src={composedUrl}
              poster={stillUrl ?? undefined}
              className="absolute inset-0 h-full w-full object-contain"
              playsInline
              controls
              data-testid="studio-preview-composed-video"
            />
          ) : null}

          {showingVeo && veoUrl ? (
            // Durable CDN URL from production bundle — not a local upload.
            // Mute Veo native audio so MarketMonth VO remains the product VO.
            <video
              src={veoUrl}
              poster={stillUrl ?? undefined}
              className="absolute inset-0 h-full w-full object-cover"
              autoPlay
              loop
              muted
              playsInline
              controls
              data-testid="studio-preview-scene-video"
            />
          ) : null}

          {showingStill && stillUrl ? (
            <>
              {/* Durable CDN URL from production bundle — not a local upload. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={stillUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                data-testid="studio-preview-scene-image"
              />
            </>
          ) : null}

          {showDomOverlay ? (
            <SceneOnScreenOverlay
              onScreenText={overlayText}
              sceneOrder={scene?.order ?? 0}
              showBadges={false}
            />
          ) : null}

          {!hasFrameMedia ? (
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
          ) : null}

          {!showingComposed ? (
            <>
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
                  {showingStill ? (
                    <button
                      type="button"
                      className="rounded p-0.5 text-white/85 transition-colors hover:bg-white/15 hover:text-white"
                      aria-label="Zoom preview image"
                      title="Zoom image"
                      data-testid="studio-preview-zoom"
                      onClick={() => {
                        if (stillUrl) setZoomStillUrl(stillUrl);
                      }}
                    >
                      <Maximize2 className="h-2.5 w-2.5" aria-hidden />
                    </button>
                  ) : (
                    <Maximize2 className="h-2.5 w-2.5" aria-hidden />
                  )}
                </span>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {isShort && voiceUrl && !showingComposed ? (
        <div
          className="border-t border-border/50 px-2.5 py-2"
          data-testid="studio-preview-voice-player"
        >
          <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.12em] text-text-muted">
            Scene voiceover
            {voiceDurationSeconds == null
              ? " · duration Unverified"
              : ` · ${voiceDurationSeconds.toFixed(2)}s`}
          </p>
          <audio
            controls
            src={voiceUrl}
            className="w-full"
            data-testid="studio-preview-voice-audio"
          />
        </div>
      ) : null}

      {zoomed && stillUrl
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 sm:p-8"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              data-testid="studio-preview-zoom-dialog"
              onClick={() => setZoomStillUrl(null)}
            >
              <p id={titleId} className="sr-only">
                Zoomed scene preview
              </p>
              <button
                type="button"
                className="absolute top-3 right-3 rounded-md bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
                aria-label="Close zoomed preview"
                data-testid="studio-preview-zoom-close"
                onClick={() => setZoomStillUrl(null)}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
              <div
                className={cn(
                  "relative max-h-full max-w-full overflow-hidden shadow-2xl",
                  isShort ? "aspect-[9/16]" : "aspect-video"
                )}
                onClick={(event) => event.stopPropagation()}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={stillUrl}
                  alt=""
                  className="h-full w-full object-contain"
                  data-testid="studio-preview-zoom-image"
                />
                {overlayTextTrimmed ? (
                  <SceneOnScreenOverlay
                    onScreenText={overlayText}
                    sceneOrder={scene?.order ?? 0}
                    showBadges={false}
                    compact={false}
                  />
                ) : null}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
