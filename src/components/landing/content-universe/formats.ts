import { FileText } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

import {
  InstagramIcon,
  LinkedinIcon,
  TiktokIcon,
  YoutubeIcon,
} from "@/components/landing/social-icons";

/**
 * Illustrative Content Flow formats for the landing diagram only.
 * Not real customer analytics — keep honesty labels at the section level.
 *
 * `accent` is a semantic brand key, not a raw color — `ACCENT_TONES` below
 * is the single place that resolves it to concrete classes, so a future
 * palette change never requires touching this data.
 */
export type AccentTone = "instagram" | "tiktok" | "youtube" | "linkedin" | "seo";

export type ContentFormat = {
  id: string;
  sequence: number;
  label: string;
  metric: string;
  metricLabel: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  accent: AccentTone;
};

export const FORMATS: ContentFormat[] = [
  {
    id: "instagram",
    sequence: 1,
    label: "Instagram Post",
    metric: "128K",
    metricLabel: "Views",
    icon: InstagramIcon,
    accent: "instagram",
  },
  {
    id: "tiktok",
    sequence: 2,
    label: "TikTok Video",
    metric: "215K",
    metricLabel: "Views",
    icon: TiktokIcon,
    accent: "tiktok",
  },
  {
    id: "youtube",
    sequence: 3,
    label: "YouTube Short",
    metric: "96.2K",
    metricLabel: "Views",
    icon: YoutubeIcon,
    accent: "youtube",
  },
  {
    id: "linkedin",
    sequence: 4,
    label: "LinkedIn Post",
    metric: "41.6K",
    metricLabel: "Followers",
    icon: LinkedinIcon,
    accent: "linkedin",
  },
  {
    id: "seo",
    sequence: 5,
    label: "SEO Article",
    metric: "18.6K",
    metricLabel: "Reads",
    icon: FileText,
    accent: "seo",
  },
];

/** Icon-circle and trend-line colors per accent key — the only place a
 * platform hex value is allowed to live. Structural card chrome (border,
 * background, text) stays on MarketMonth brand tokens everywhere else. */
export const ACCENT_TONES: Record<
  AccentTone,
  { iconBg: string; iconText: string; trend: string }
> = {
  instagram: {
    iconBg: "bg-[#E1306C]/12",
    iconText: "text-[#E1306C]",
    trend: "text-[#E1306C]",
  },
  tiktok: {
    iconBg: "bg-foreground/10",
    iconText: "text-foreground",
    trend: "text-foreground/70",
  },
  youtube: {
    iconBg: "bg-[#FF0000]/12",
    iconText: "text-[#FF0000]",
    trend: "text-[#FF0000]",
  },
  linkedin: {
    iconBg: "bg-[#0A66C2]/12",
    iconText: "text-[#0A66C2]",
    trend: "text-[#0A66C2]",
  },
  seo: {
    iconBg: "bg-success/12",
    iconText: "text-success",
    trend: "text-success",
  },
};

/** Shared animation timing so the connector network and the card glow stay
 * in the same repeating sequence without hardcoding the same numbers twice. */
export const SEQUENCE_STEP_S = 1.1;
export const SEQUENCE_LOOP_S = 8;

/**
 * Column gap for the 5-up output grid, expressed as a fraction of the row's
 * total width (used as the Tailwind arbitrary value `gap-[1.8%]` on the
 * grid itself). A percentage — rather than a fixed `16px` gap — keeps this
 * ratio constant at every viewport width, so `gridColumnCenterFraction`
 * below can derive the SVG connector's branch positions from pure fractions
 * and still land exactly on each card's true center, with no separate
 * pixel measurement or hand-guessed offset.
 */
export const GRID_GAP_FRACTION = 0.018;

/** True horizontal center of grid column `index` (of `count` equal columns
 * separated by `GRID_GAP_FRACTION`), as a fraction of the row's total
 * width. This is the one formula the CSS Grid and the SVG connectors both
 * resolve to, so a branch always meets its card's real center. */
export function gridColumnCenterFraction(index: number, count: number): number {
  const columnWidth = (1 - (count - 1) * GRID_GAP_FRACTION) / count;
  return index * (columnWidth + GRID_GAP_FRACTION) + columnWidth / 2;
}
