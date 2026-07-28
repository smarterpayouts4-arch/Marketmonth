import { channelRegistry } from "../channel-registry";

export const youtubeLongManifest = {
  key: "youtubeLong" as const,
  ...channelRegistry.youtubeLong,
  folder: "youtube-long",
  input: "ContentAtom (ready) by identity reference",
  lock: "semantic StrategyLock from src/brain/strategy-lock",
  packageOwnership: "Future package — not implemented",
} as const;
