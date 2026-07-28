"use client";

import { cn } from "@/lib/utils";

import { logicalSizeFor } from "./studio-channels";
import type { ContentChannel, ProductionPackage } from "./types";
import { PreviewScaler } from "./preview-scaler";
import { YoutubeShortPreview } from "./previews/youtube-short-preview";

type PlatformPreviewFrameProps = {
  channel: ContentChannel;
  pkg: ProductionPackage;
  brandName: string;
  headlineOverride?: string;
  className?: string;
  "aria-label"?: string;
};

/** Scaled platform shell only — YouTube Short is the sole connected preview. */
export function PlatformPreviewFrame({
  channel,
  pkg,
  brandName,
  headlineOverride,
  className,
  "aria-label": ariaLabel,
}: PlatformPreviewFrameProps) {
  const { width, height } = logicalSizeFor(channel, pkg.format);

  return (
    <PreviewScaler
      logicalWidth={width}
      logicalHeight={height}
      className={cn("h-full w-full", className)}
      aria-label={ariaLabel ?? `${channel} platform preview`}
    >
      {channel === "youtube_short" ? (
        <YoutubeShortPreview
          pkg={pkg}
          brandName={brandName}
          headlineOverride={headlineOverride}
        />
      ) : (
        <div className="flex h-full items-center justify-center p-6 text-center text-sm text-text-secondary">
          Adapter not connected yet
        </div>
      )}
    </PreviewScaler>
  );
}
