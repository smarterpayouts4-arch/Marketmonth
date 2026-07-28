"use client";

import { cn } from "@/lib/utils";

import {
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  RedditIcon,
  ThreadsIcon,
  TikTokIcon,
  XIcon,
  YoutubeIcon,
  YoutubeShortsIcon,
} from "./channel-icons";
import {
  CHANNEL_LABELS,
  CONTENT_STUDIO_CHANNELS,
  isStudioChannelEnabled,
  type ContentStudioChannel,
} from "./studio-channels";

const CHANNEL_META: Record<
  ContentStudioChannel,
  { label: string; icon: typeof FacebookIcon }
> = {
  youtube_short: {
    label: CHANNEL_LABELS.youtube_short,
    icon: YoutubeShortsIcon,
  },
  youtube: { label: CHANNEL_LABELS.youtube, icon: YoutubeIcon },
  facebook: { label: CHANNEL_LABELS.facebook, icon: FacebookIcon },
  instagram: { label: CHANNEL_LABELS.instagram, icon: InstagramIcon },
  tiktok: { label: CHANNEL_LABELS.tiktok, icon: TikTokIcon },
  x: { label: CHANNEL_LABELS.x, icon: XIcon },
  reddit: { label: CHANNEL_LABELS.reddit, icon: RedditIcon },
  threads: { label: CHANNEL_LABELS.threads, icon: ThreadsIcon },
  linkedin: { label: CHANNEL_LABELS.linkedin, icon: LinkedInIcon },
};

type ContentChannelTabsProps = {
  active: ContentStudioChannel;
  onChange: (channel: ContentStudioChannel) => void;
};

export function ContentChannelTabs({
  active,
  onChange,
}: ContentChannelTabsProps) {
  const channels = CONTENT_STUDIO_CHANNELS;

  return (
    <div
      role="tablist"
      aria-label="Content channels"
      className="flex flex-wrap items-center gap-1"
    >
      {channels.map((channel) => {
        const meta = CHANNEL_META[channel];
        const Icon = meta.icon;
        const selected = active === channel;
        const enabled = isStudioChannelEnabled(channel);
        return (
          <button
            key={channel}
            type="button"
            role="tab"
            id={`channel-tab-${channel}`}
            aria-selected={selected}
            aria-controls="channel-preview-panel"
            aria-label={
              enabled ? meta.label : `${meta.label} (not connected)`
            }
            title={enabled ? meta.label : `${meta.label} — not connected`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(channel)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              e.preventDefault();
              const idx = channels.indexOf(channel);
              const next =
                e.key === "ArrowRight"
                  ? channels[(idx + 1) % channels.length]
                  : channels[(idx - 1 + channels.length) % channels.length];
              onChange(next);
              queueMicrotask(() => {
                document.getElementById(`channel-tab-${next}`)?.focus();
              });
            }}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md border px-2 text-[11px] font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
              selected
                ? "border-primary bg-primary/10 text-foreground underline decoration-primary/70 decoration-2 underline-offset-4"
                : "border-transparent bg-transparent text-text-secondary hover:bg-muted hover:text-foreground",
              !enabled && "opacity-55"
            )}
          >
            <Icon className="size-[18px] shrink-0" />
            <span className="hidden sm:inline">{meta.label}</span>
            {!enabled ? (
              <span className="hidden text-[9px] tracking-wide text-text-secondary uppercase sm:inline">
                soon
              </span>
            ) : null}
            {selected ? <span className="sr-only">(selected)</span> : null}
          </button>
        );
      })}
    </div>
  );
}
