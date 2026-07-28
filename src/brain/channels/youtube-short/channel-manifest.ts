import { channelRegistry } from "../channel-registry";

export const youtubeShortManifest = {
  key: "youtubeShort" as const,
  ...channelRegistry.youtubeShort,
  folder: "youtube-short",
  input: "ContentAtom (ready) by identity reference",
  lock: "semantic StrategyLock from src/brain/strategy-lock",
  packageOwnership: "YouTubeShortPackage lifecycle (draft|validated|rejected)",
} as const;

/** Registry-facing alias used by channel index barrels. */
export const channelManifest = youtubeShortManifest;
