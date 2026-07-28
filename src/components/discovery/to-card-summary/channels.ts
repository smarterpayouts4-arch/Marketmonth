import type { BrandProfileView } from "@/components/discovery/types";

import { ARTICLE_PLATFORM_HINTS, META_VISIBLE, PLATFORM_LABELS } from "./limits";

export type ChannelsMapped = {
  activeChannels: string[];
  missedChannels: string[];
  missedArticlePlatforms: string[];
  activeChannelsFull: string[];
  missedChannelsFull: string[];
  missedArticlePlatformsFull: string[];
  channelsOverflow: boolean;
};

function detectArticleMentions(profile: BrandProfileView): Set<string> {
  const blob = [
    profile.website,
    profile.description,
    profile.valueProposition,
    ...profile.socialProfiles.map((s) => s.url ?? ""),
  ].join(" ");
  const found = new Set<string>();
  for (const hint of ARTICLE_PLATFORM_HINTS) {
    if (hint.re.test(blob)) found.add(hint.id);
  }
  return found;
}

export function mapChannels(profile: BrandProfileView): ChannelsMapped {
  const activeChannelsFull = profile.socialProfiles
    .filter((s) => s.status === "present")
    .map((s) => PLATFORM_LABELS[s.platform] ?? s.platform);

  const missedChannelsFull = profile.socialProfiles
    .filter((s) => s.status === "missing")
    .map((s) => PLATFORM_LABELS[s.platform] ?? s.platform);

  const presentArticles = detectArticleMentions(profile);
  const missedArticlePlatformsFull = ARTICLE_PLATFORM_HINTS.filter(
    (hint) => !presentArticles.has(hint.id)
  ).map((hint) => hint.label);

  const activeChannels = activeChannelsFull.slice(0, META_VISIBLE.channels);
  const missedChannels = missedChannelsFull.slice(0, META_VISIBLE.channels);
  const missedArticlePlatforms = missedArticlePlatformsFull.slice(
    0,
    META_VISIBLE.channels
  );

  const channelsOverflow =
    activeChannelsFull.length > activeChannels.length ||
    missedChannelsFull.length > missedChannels.length ||
    missedArticlePlatformsFull.length > missedArticlePlatforms.length;

  return {
    activeChannels,
    missedChannels,
    missedArticlePlatforms,
    activeChannelsFull,
    missedChannelsFull,
    missedArticlePlatformsFull,
    channelsOverflow,
  };
}
