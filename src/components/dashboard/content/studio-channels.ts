import {
  channelRegistry,
  type ChannelKey,
} from "@/brain/channels/channel-registry";

/** Studio UI channel ids (snake_case for localStorage/drafts). */
export type ContentStudioChannel =
  | "threads"
  | "facebook"
  | "instagram"
  | "reddit"
  | "youtube"
  | "youtube_short"
  | "tiktok"
  | "x"
  | "linkedin";

export type ContentChannel = ContentStudioChannel;

const KEY_BY_STUDIO: Record<ContentStudioChannel, ChannelKey | null> = {
  youtube_short: "youtubeShort",
  youtube: "youtubeLong",
  facebook: "facebook",
  instagram: "instagram",
  tiktok: "tiktok",
  x: "x",
  reddit: "reddit",
  threads: "threads",
  linkedin: "linkedin",
};

/** Ordered Studio rail — status from channelRegistry. */
export const CONTENT_STUDIO_CHANNELS = [
  "youtube_short",
  "youtube",
  "facebook",
  "instagram",
  "tiktok",
  "x",
  "reddit",
  "threads",
  "linkedin",
] as const satisfies ReadonlyArray<ContentStudioChannel>;

export function studioChannelStatus(
  channel: ContentStudioChannel
): "enabled" | "not_connected" {
  const key = KEY_BY_STUDIO[channel];
  if (!key) return "not_connected";
  return channelRegistry[key].status;
}

export function isStudioChannelEnabled(channel: ContentStudioChannel): boolean {
  return studioChannelStatus(channel) === "enabled";
}

export const CHANNEL_FORMATS: Record<ContentChannel, readonly string[]> = {
  threads: ["text_post"],
  facebook: ["post", "reel"],
  instagram: ["reel"],
  reddit: ["text_post"],
  youtube: ["video"],
  youtube_short: ["short_video"],
  tiktok: ["short_video"],
  x: ["text_post"],
  linkedin: ["text_post"],
};

export const CHANNEL_FORMAT_LABELS: Record<
  ContentChannel,
  Record<string, string>
> = {
  threads: { text_post: "Text" },
  facebook: { post: "Post", reel: "Reel" },
  instagram: { reel: "Reel" },
  reddit: { text_post: "Text" },
  youtube: { video: "Video" },
  youtube_short: { short_video: "Short" },
  tiktok: { short_video: "Short" },
  x: { text_post: "Post" },
  linkedin: { text_post: "Post" },
};

export const CHANNEL_LOGICAL_SIZE: Record<
  ContentChannel,
  { width: number; height: number }
> = {
  threads: { width: 900, height: 1100 },
  facebook: { width: 1200, height: 1200 },
  instagram: { width: 1080, height: 1080 },
  reddit: { width: 900, height: 1100 },
  youtube: { width: 1280, height: 720 },
  youtube_short: { width: 1080, height: 1920 },
  tiktok: { width: 1080, height: 1920 },
  x: { width: 1200, height: 675 },
  linkedin: { width: 1200, height: 627 },
};

export const CHANNEL_LABELS: Record<ContentStudioChannel, string> = {
  threads: "Threads",
  facebook: "Facebook",
  instagram: "Instagram",
  reddit: "Reddit",
  youtube: "YouTube Long",
  youtube_short: "YouTube Shorts",
  tiktok: "TikTok",
  x: "X",
  linkedin: "LinkedIn",
};

export function defaultFormat(channel: ContentChannel): string {
  return CHANNEL_FORMATS[channel][0];
}

export function isSupportedFormat(
  channel: ContentChannel,
  format: string
): boolean {
  return (CHANNEL_FORMATS[channel] as readonly string[]).includes(format);
}

export function logicalSizeFor(
  channel: ContentChannel,
  _format?: string
): {
  width: number;
  height: number;
} {
  void _format;
  return CHANNEL_LOGICAL_SIZE[channel];
}
