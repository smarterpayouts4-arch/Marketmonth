/**
 * Platform (social destination) vs Format (output shape).
 * Studio tabs read this — unfinished platforms never fake generation.
 */

export type PlatformId =
  | "youtube"
  | "instagram"
  | "tiktok"
  | "linkedin"
  | "facebook"
  | "x";

export type ContentFormatId = "youtube_short" | "youtube_video";

export type PlatformStatus = "active" | "coming_soon" | "disabled";
export type FormatStatus = "active" | "coming_soon" | "disabled";

export type ContentFormatDefinition = {
  id: ContentFormatId;
  platformId: PlatformId;
  label: string;
  description: string;
  status: FormatStatus;
  defaultDurationSeconds: number;
  supportedAspectRatios: readonly string[];
};

export type PlatformDefinition = {
  id: PlatformId;
  label: string;
  status: PlatformStatus;
  formats: readonly ContentFormatDefinition[];
};

export const YOUTUBE_SHORT_FORMAT: ContentFormatDefinition = {
  id: "youtube_short",
  platformId: "youtube",
  label: "YouTube Short",
  description: "9:16 · approximately 30–60 seconds",
  status: "active",
  defaultDurationSeconds: 45,
  supportedAspectRatios: ["9:16"],
};

export const YOUTUBE_VIDEO_FORMAT: ContentFormatDefinition = {
  id: "youtube_video",
  platformId: "youtube",
  label: "YouTube Video",
  description: "16:9 · approximately 3–8 minutes",
  status: "active",
  defaultDurationSeconds: 300,
  supportedAspectRatios: ["16:9"],
};

export const PLATFORM_REGISTRY: readonly PlatformDefinition[] = [
  {
    id: "youtube",
    label: "YouTube",
    status: "active",
    formats: [YOUTUBE_SHORT_FORMAT, YOUTUBE_VIDEO_FORMAT],
  },
  {
    id: "instagram",
    label: "Instagram",
    status: "coming_soon",
    formats: [],
  },
  {
    id: "tiktok",
    label: "TikTok",
    status: "coming_soon",
    formats: [],
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    status: "coming_soon",
    formats: [],
  },
  {
    id: "x",
    label: "X",
    status: "coming_soon",
    formats: [],
  },
  {
    id: "facebook",
    label: "Facebook",
    status: "coming_soon",
    formats: [],
  },
] as const;

export function getPlatform(id: PlatformId): PlatformDefinition | undefined {
  return PLATFORM_REGISTRY.find((p) => p.id === id);
}

export function getFormat(
  id: ContentFormatId
): ContentFormatDefinition | undefined {
  for (const p of PLATFORM_REGISTRY) {
    const f = p.formats.find((x) => x.id === id);
    if (f) return f;
  }
  return undefined;
}

export function listActiveFormatsForPlatform(
  platformId: PlatformId
): ContentFormatDefinition[] {
  const p = getPlatform(platformId);
  if (!p || p.status !== "active") return [];
  return p.formats.filter((f) => f.status === "active");
}

export function defaultFormatIdsForYoutube(): ContentFormatId[] {
  return ["youtube_short", "youtube_video"];
}
