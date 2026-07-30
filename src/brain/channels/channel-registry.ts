export type ChannelStatus = "enabled" | "not_connected";

export type ChannelKey =
  | "youtubeShort"
  | "youtubeLong"
  | "facebook"
  | "instagram"
  | "tiktok"
  | "x"
  | "reddit"
  | "threads"
  | "linkedin";

export type ChannelRegistryEntry = {
  status: ChannelStatus;
  specialist: string;
  label: string;
};

/**
 * Specialist enablement registry: which channel specialists exist and may generate.
 *
 * - Only `enabled` specialists may call generate (YouTube Short today).
 * - `not_connected` folders are honesty scaffolds — never fake generation.
 *
 * Studio format tabs do NOT read this file. They use
 * `src/brain/content-studio/platform-registry.ts` (`PLATFORM_REGISTRY`), where
 * YouTube Short + YouTube Video formats are active. Studio Video ≠ `youtubeLong`.
 *
 * Dual registries are intentional until Video graduates to an enabled
 * `youtube-long` specialist (Short adapter pattern + ADR).
 */
export const channelRegistry = {
  youtubeShort: {
    status: "enabled",
    specialist: "youtube-short",
    label: "YouTube Short",
  },
  youtubeLong: {
    status: "not_connected",
    specialist: "youtube-long",
    label: "YouTube Long",
  },
  facebook: {
    status: "not_connected",
    specialist: "facebook",
    label: "Facebook",
  },
  instagram: {
    status: "not_connected",
    specialist: "instagram",
    label: "Instagram",
  },
  tiktok: {
    status: "not_connected",
    specialist: "tiktok",
    label: "TikTok",
  },
  x: {
    status: "not_connected",
    specialist: "x",
    label: "X",
  },
  reddit: {
    status: "not_connected",
    specialist: "reddit",
    label: "Reddit",
  },
  threads: {
    status: "not_connected",
    specialist: "threads",
    label: "Threads",
  },
  linkedin: {
    status: "not_connected",
    specialist: "linkedin",
    label: "LinkedIn",
  },
} as const satisfies Record<ChannelKey, ChannelRegistryEntry>;

export type ChannelRegistry = typeof channelRegistry;

export function listChannelKeys(): ChannelKey[] {
  return Object.keys(channelRegistry) as ChannelKey[];
}

export function getChannelEntry(key: ChannelKey): ChannelRegistryEntry {
  return channelRegistry[key];
}

export function isChannelEnabled(key: ChannelKey): boolean {
  return channelRegistry[key].status === "enabled";
}

export function listEnabledChannels(): ChannelKey[] {
  return listChannelKeys().filter((k) => channelRegistry[k].status === "enabled");
}
