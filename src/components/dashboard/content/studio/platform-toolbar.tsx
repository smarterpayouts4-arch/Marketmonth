"use client";

import type { ReactElement } from "react";

import {
  PLATFORM_REGISTRY,
  YOUTUBE_SHORT_FORMAT,
  YOUTUBE_VIDEO_FORMAT,
  type ContentFormatId,
  type ContentFormatPackage,
  type PlatformId,
} from "@/brain/content-studio";
import {
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  TikTokIcon,
  XIcon,
  YoutubeIcon,
} from "@/components/dashboard/content/channel-icons";
import { cn } from "@/lib/utils";

type PlatformToolbarProps = {
  platform: PlatformId;
  onPlatformChange: (id: PlatformId) => void;
  formatId: ContentFormatId;
  onFormatChange: (id: ContentFormatId) => void;
  packages: ContentFormatPackage[];
};

const ICONS: Record<
  PlatformId,
  (props: { className?: string }) => ReactElement
> = {
  youtube: YoutubeIcon,
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  linkedin: LinkedInIcon,
  x: XIcon,
  facebook: FacebookIcon,
};

const BRAND: Record<PlatformId, string> = {
  youtube: "var(--brand-youtube)",
  instagram: "var(--brand-instagram)",
  tiktok: "var(--brand-tiktok)",
  linkedin: "var(--brand-linkedin)",
  x: "var(--brand-x)",
  facebook: "var(--brand-facebook)",
};

const YT_FORMATS = [YOUTUBE_SHORT_FORMAT, YOUTUBE_VIDEO_FORMAT] as const;

/** Platform logos + Short|Video — sizes/colors from content-studio.css .studio-* */
export function StudioPlatformToolbar({
  platform,
  onPlatformChange,
  formatId,
  onFormatChange,
  packages,
}: PlatformToolbarProps) {
  return (
    <div className="studio-platforms" data-testid="studio-platform-toolbar">
      <div
        className="studio-platforms__row"
        role="tablist"
        aria-label="Platforms"
      >
        {PLATFORM_REGISTRY.map((p) => {
          const Icon = ICONS[p.id];
          const active = p.id === "youtube" && platform === "youtube";
          const soon = p.status !== "active";
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={soon}
              title={soon ? `${p.label} — Coming soon` : p.label}
              onClick={() => {
                if (!soon) onPlatformChange(p.id);
              }}
              className={cn(
                "studio-platform-btn",
                active && "studio-platform-btn--active shadow-soft",
                soon && "studio-platform-btn--soon"
              )}
              style={{ color: BRAND[p.id] }}
              data-testid={`platform-tab-${p.id}`}
            >
              <Icon />
              <span className="sr-only">{p.label}</span>
            </button>
          );
        })}
      </div>

      {platform === "youtube" ? (
        <div
          className="studio-format-tabs"
          role="group"
          aria-label="YouTube formats"
          data-testid="studio-format-tabs"
        >
          {YT_FORMATS.map((f) => {
            const pkg = packages.find((p) => p.formatId === f.id);
            const selected = formatId === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => {
                  onPlatformChange("youtube");
                  onFormatChange(f.id);
                }}
                className={cn(
                  "studio-format-tab",
                  selected && "shadow-soft"
                )}
                data-testid={`format-tab-${f.id}`}
              >
                <YoutubeIcon
                  className={
                    selected ? "text-[var(--brand-youtube)]" : "opacity-50"
                  }
                />
                <span>{f.label.replace("YouTube ", "")}</span>
                {pkg ? (
                  <span className="text-[10px] font-normal text-text-muted opacity-80">
                    {f.supportedAspectRatios[0]}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
