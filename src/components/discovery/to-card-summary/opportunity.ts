import type { BrandProfileView } from "@/components/discovery/types";

import { LIMITS } from "./limits";
import type { ChannelsMapped } from "./channels";
import { previewField, stripDashes } from "./text";

type OpportunityArgs = {
  profile: BrandProfileView;
  leadOffer: string;
  /** Kept for call-site stability; channel gaps are not strategy defaults. */
  channels: ChannelsMapped;
};

export type OpportunityMapped = {
  growthOpportunity: string;
  growthOpportunityFull: string;
  growthOpportunityOverflow: boolean;
  growthAngle: string;
  growthAngleFull: string;
  growthAngleOverflow: boolean;
  contentAngles: string[];
  contentAnglesFull: string[];
  contentAnglesOverflow: boolean;
};

export function mapOpportunity({
  profile,
  leadOffer,
}: OpportunityArgs): OpportunityMapped {
  const contentAnglesFull = (profile.seoSummary?.contentOpportunities ?? [])
    .map(stripDashes)
    .filter(Boolean);
  const contentAngles = contentAnglesFull.slice(0, 2);

  // Content decision first - missing website links are not “missed channels.”
  const growthAngleRaw = leadOffer
    ? `Turn real decisions about ${leadOffer} into clear explanations, then choose distribution formats that fit that content.`
    : `Decide the idea your brand can own, then test formats. Do not treat undetected social links as absence.`;

  const opportunitySource = profile.marketingOpportunity?.trim();
  const growthOpportunity = previewField(
    opportunitySource &&
      !/educational content|user-generated|tiktok|instagram/i.test(
        opportunitySource
      )
      ? opportunitySource
      : `Own a clear decision story around ${leadOffer}, not generic category education.`,
    LIMITS.growthOpportunity
  );
  const growthAngle = previewField(growthAngleRaw, LIMITS.growthAngle);

  return {
    growthOpportunity: growthOpportunity.preview,
    growthOpportunityFull: growthOpportunity.full,
    growthOpportunityOverflow: growthOpportunity.overflow,
    growthAngle: growthAngle.preview,
    growthAngleFull: growthAngle.full,
    growthAngleOverflow: growthAngle.overflow,
    contentAngles,
    contentAnglesFull,
    contentAnglesOverflow: contentAnglesFull.length > contentAngles.length,
  };
}
