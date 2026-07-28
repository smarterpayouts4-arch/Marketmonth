import type { BrandProfileView } from "@/components/discovery/types";

import { LIMITS } from "./limits";
import type { ChannelsMapped } from "./channels";
import { previewField, stripDashes, summaryJoin } from "./text";

type AudienceArgs = {
  profile: BrandProfileView;
  valueProposition: string;
  leadOffer: string;
  channels: ChannelsMapped;
};

export type AudienceMapped = {
  audience: string;
  audienceFull: string;
  audienceOverflow: boolean;
  audienceNeed: string;
  audienceNeedFull: string;
  audienceNeedOverflow: boolean;
  audienceHook: string;
  audienceHookFull: string;
  audienceHookOverflow: boolean;
};

export function mapAudience({
  profile,
  valueProposition,
  leadOffer,
  channels,
}: AudienceArgs): AudienceMapped {
  const { activeChannels, missedChannels, missedArticlePlatforms } = channels;

  const audienceNeedRaw = valueProposition
    ? `They want a clear path to ${stripDashes(valueProposition).replace(/\.$/, "").toLowerCase()}.`
    : `They are evaluating options and need a trustworthy guide before they buy or sign up.`;

  const audienceHookRaw = activeChannels.length
    ? `They already meet the brand on ${summaryJoin(activeChannels)}. Lead with proof about ${leadOffer}; treat undetected links as unverified, not proven gaps (${summaryJoin(
        missedChannels.length ? missedChannels : missedArticlePlatforms
      ) || "none listed"}).`
    : `Website social links were not detected. First win: lead with proof about ${leadOffer}, then choose formats—not a channel checklist.`;

  const audience = previewField(
    profile.audience || "Customers in this category",
    LIMITS.audience
  );
  const audienceNeed = previewField(audienceNeedRaw, LIMITS.audienceNeed);
  const audienceHook = previewField(audienceHookRaw, LIMITS.audienceHook);

  return {
    audience: audience.preview,
    audienceFull: audience.full,
    audienceOverflow: audience.overflow,
    audienceNeed: audienceNeed.preview,
    audienceNeedFull: audienceNeed.full,
    audienceNeedOverflow: audienceNeed.overflow,
    audienceHook: audienceHook.preview,
    audienceHookFull: audienceHook.full,
    audienceHookOverflow: audienceHook.overflow,
  };
}
