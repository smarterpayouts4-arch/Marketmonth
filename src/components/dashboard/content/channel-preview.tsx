"use client";

import { useRef, useState } from "react";
import { Expand } from "lucide-react";

import { cn } from "@/lib/utils";

import type { ContentChannel, ProductionPackage } from "./types";
import { PlatformPreviewFrame } from "./platform-preview-frame";
import { PreviewViewDialog } from "./preview-view-dialog";

type ChannelPreviewProps = {
  channel: ContentChannel;
  pkg: ProductionPackage;
  brandName: string;
  headlineOverride?: string;
  updating?: boolean;
};

export function ChannelPreview({
  channel,
  pkg,
  brandName,
  headlineOverride,
  updating,
}: ChannelPreviewProps) {
  const [viewOpen, setViewOpen] = useState(false);
  const viewButtonRef = useRef<HTMLButtonElement | null>(null);

  return (
    <>
      <div
        id="channel-preview-panel"
        role="tabpanel"
        aria-labelledby={`channel-tab-${channel}`}
        className={cn(
          "relative mx-auto w-full max-w-[720px] min-h-[380px] flex-1 overflow-hidden rounded-xl border border-border bg-muted/20"
        )}
      >
        {updating ? (
          <p
            className="absolute top-2 left-2 z-10 rounded-md bg-card/95 px-2 py-0.5 text-[11px] font-medium text-text-secondary shadow-soft"
            aria-live="polite"
          >
            Updating…
          </p>
        ) : null}

        <button
          ref={viewButtonRef}
          type="button"
          className="absolute top-2 right-2 z-10 inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card/95 px-2 text-xs font-medium text-foreground shadow-soft hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          onClick={() => setViewOpen(true)}
          aria-haspopup="dialog"
        >
          <Expand className="size-3.5" aria-hidden />
          View
        </button>

        <PlatformPreviewFrame
          channel={channel}
          pkg={pkg}
          brandName={brandName}
          headlineOverride={headlineOverride}
        />
      </div>

      <PreviewViewDialog
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        channel={channel}
        pkg={pkg}
        brandName={brandName}
        headlineOverride={headlineOverride}
        returnFocusRef={viewButtonRef}
      />
    </>
  );
}
