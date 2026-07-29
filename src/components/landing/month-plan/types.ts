/**
 * Typed data model for the "Month Plan" roadmap feature.
 *
 * Illustrative demo data only — not a persisted product model. Every value a
 * component needs (progress, execution chips, status) is derived from this
 * shape rather than hardcoded in JSX, so the UI stays honest if the demo
 * data changes.
 *
 * Hierarchy: Monthly plan → Weekly theme → Daily idea → Channel executions.
 * A `DailyContentItem` is one core content idea; its `executions` are the
 * platform-specific versions made from that idea (channel + format
 * together), never a bare list of platforms. Never show all five channels
 * on a single idea — real weeks mix 1–3 executions per idea and cover all
 * five channels across the week as a whole.
 */

export type SocialChannel =
  | "facebook"
  | "instagram"
  | "youtube"
  | "tiktok"
  | "linkedin";

export type ContentStatus =
  | "planned"
  | "scheduled"
  | "published"
  | "draft"
  | "empty";

export type ContentType =
  | "educational"
  | "how-to"
  | "quick-tip"
  | "product-spotlight"
  | "lifestyle";

/** The shape a channel execution takes — distinct per channel so the same
 * idea reads as "adapted for," not "copy-pasted to," each platform. */
export type ContentFormat = "carousel" | "reel" | "short" | "video" | "post";

/** One platform-specific version of a daily idea. Always rendered as
 * "Channel · Format" together — never a bare channel name — so the UI
 * never implies one identical asset is blindly cross-posted everywhere. */
export type ChannelExecution = {
  channel: SocialChannel;
  format: ContentFormat;
};

export type DailyContentItem = {
  id: string;
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";
  date: string;
  title: string;
  description: string;
  /** `null` renders a placeholder (see `ImagePlaceholder`) instead of a photo. */
  imageSrc: string | null;
  imageAlt: string;
  contentType: ContentType;
  /** 1–3 platform-specific versions of this idea. Never all five channels
   * on one idea — see module doc. */
  executions: ChannelExecution[];
  status: ContentStatus;
};

export type MarketingWeek = {
  id: string;
  label: string;
  dateRange: string;
  theme: string;
  description: string;
  strategyTitle: string;
  strategyDescription: string;
  heroImageSrc: string | null;
  heroImageAlt: string;
  totalCount: number;
  posts: DailyContentItem[];
};

export const ALL_SOCIAL_CHANNELS: SocialChannel[] = [
  "facebook",
  "instagram",
  "youtube",
  "tiktok",
  "linkedin",
];

export const CHANNEL_METADATA: Record<
  SocialChannel,
  { label: string; ariaLabel: string }
> = {
  facebook: { label: "Facebook", ariaLabel: "Facebook distribution channel" },
  instagram: {
    label: "Instagram",
    ariaLabel: "Instagram distribution channel",
  },
  youtube: { label: "YouTube", ariaLabel: "YouTube distribution channel" },
  tiktok: { label: "TikTok", ariaLabel: "TikTok distribution channel" },
  linkedin: { label: "LinkedIn", ariaLabel: "LinkedIn distribution channel" },
};

export const FORMAT_METADATA: Record<ContentFormat, { label: string }> = {
  carousel: { label: "Carousel" },
  reel: { label: "Reel" },
  short: { label: "Short" },
  video: { label: "Video" },
  post: { label: "Post" },
};

export const CONTENT_TYPE_METADATA: Record<ContentType, { label: string }> = {
  educational: { label: "Educational" },
  "how-to": { label: "How-To" },
  "quick-tip": { label: "Quick Tip" },
  "product-spotlight": { label: "Product Spotlight" },
  lifestyle: { label: "Lifestyle" },
};

export const STATUS_METADATA: Record<
  ContentStatus,
  { label: string; tone: "primary" | "warning" | "success" | "neutral" }
> = {
  planned: { label: "Planned", tone: "primary" },
  scheduled: { label: "Scheduled", tone: "warning" },
  published: { label: "Published", tone: "success" },
  draft: { label: "Draft", tone: "neutral" },
  empty: { label: "Empty", tone: "neutral" },
};

/** Weeks with 0 planned items still have a defined percentage (0), not NaN. */
export function weekPlannedCount(week: MarketingWeek): number {
  return week.posts.filter((post) => post.status === "planned").length;
}

export function weekProgressPercent(week: MarketingWeek): number {
  if (week.totalCount === 0) return 0;
  return Math.round((weekPlannedCount(week) / week.totalCount) * 100);
}

/** Auto-advance index driven by the play timer's `visibleWeeks` counter,
 * clamped to a valid week index (defaults to week 1 before any reveal). */
export function weekAutoIndexFromVisibleWeeks(
  visibleWeeks: number,
  weekCount: number
): number {
  if (weekCount <= 0) return 0;
  return Math.min(Math.max(visibleWeeks - 1, 0), weekCount - 1);
}

/** Manual week-card selection always wins over auto-advance until cleared. */
export function resolveSelectedWeekIndex(
  manualIndex: number | null,
  autoIndex: number
): number {
  return manualIndex ?? autoIndex;
}

export function weekStatusBreakdown(week: MarketingWeek): {
  planned: number;
  scheduled: number;
  published: number;
} {
  return {
    planned: week.posts.filter((p) => p.status === "planned").length,
    scheduled: week.posts.filter((p) => p.status === "scheduled").length,
    published: week.posts.filter((p) => p.status === "published").length,
  };
}

/** Total channel-specific posts across the whole week — sum of every
 * idea's executions, not the idea count. */
export function weekExecutionCount(week: MarketingWeek): number {
  return week.posts.reduce((sum, post) => sum + post.executions.length, 0);
}

/** Every distinct channel used anywhere in the week, in canonical order —
 * proof that a week's ideas collectively cover all supported platforms
 * even though no single idea uses all five. */
export function weekChannelsCovered(week: MarketingWeek): SocialChannel[] {
  const used = new Set(
    week.posts.flatMap((post) => post.executions.map((e) => e.channel))
  );
  return ALL_SOCIAL_CHANNELS.filter((channel) => used.has(channel));
}

/** "Facebook, Instagram and YouTube" — natural-language join for the
 * week-level summary line. */
export function formatChannelNames(channels: SocialChannel[]): string {
  const labels = channels.map((channel) => CHANNEL_METADATA[channel].label);
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0]!;
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

const NUMBER_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
];

/** Spells out small counts ("five daily ideas") for the connecting
 * sentence above the daily grid; falls back to digits past twelve. */
export function spellNumber(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}
