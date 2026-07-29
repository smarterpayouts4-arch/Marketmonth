/**
 * Thin orchestrator: discovery card summary transform.
 * Specialists live in ./to-card-summary/*
 */
import type {
  BrandProfileView,
  DiscoveryCardSummary,
} from "@/components/discovery/types";

import { mapAudience } from "./to-card-summary/audience";
import { mapBusiness } from "./to-card-summary/business";
import { mapChannels } from "./to-card-summary/channels";
import { mapCompetitors } from "./to-card-summary/competitors";
import { mapOffering } from "./to-card-summary/offering";
import { mapOpportunity } from "./to-card-summary/opportunity";

/** Pure display transform - no AI, no network. */
export function toCardSummary(profile: BrandProfileView): DiscoveryCardSummary {
  const offering = mapOffering(profile);
  const channels = mapChannels(profile);
  const audience = mapAudience({
    profile,
    valueProposition: offering.valuePropositionSource,
    leadOffer: offering.leadOffer,
    channels,
  });
  const opportunity = mapOpportunity({
    profile,
    leadOffer: offering.leadOffer,
    channels,
  });
  const competitors = mapCompetitors(profile);
  const business = mapBusiness(profile);

  return {
    businessName: business.businessName,
    website: business.website,
    business: business.business,
    valueProposition: offering.valueProposition,
    audience: audience.audience,
    audienceNeed: audience.audienceNeed,
    audienceHook: audience.audienceHook,
    coreOffering: offering.coreOffering,
    offerItems: offering.offerItems,
    products: offering.products,
    services: offering.services,
    offerFit: offering.offerFit,
    brandPosition: offering.brandPosition,
    growthOpportunity: opportunity.growthOpportunity,
    growthAngle: opportunity.growthAngle,
    contentAngles: opportunity.contentAngles,
    activeChannels: channels.activeChannels,
    missedChannels: channels.missedChannels,
    missedArticlePlatforms: channels.missedArticlePlatforms,
    suggestedCompetitors: competitors.suggestedCompetitors,
    full: {
      business: business.businessFull,
      valueProposition: offering.valuePropositionFull,
      brandPosition: offering.brandPositionFull,
      audience: audience.audienceFull,
      audienceNeed: audience.audienceNeedFull,
      audienceHook: audience.audienceHookFull,
      coreOffering: offering.coreOfferingFull,
      offerFit: offering.offerFitFull,
      offerItems: offering.offerItemsFull,
      growthOpportunity: opportunity.growthOpportunityFull,
      growthAngle: opportunity.growthAngleFull,
      contentAngles: opportunity.contentAnglesFull,
      activeChannels: channels.activeChannelsFull,
      missedChannels: channels.missedChannelsFull,
      missedArticlePlatforms: channels.missedArticlePlatformsFull,
      suggestedCompetitors: competitors.suggestedCompetitorsFull,
    },
    overflow: {
      businessOverview:
        business.businessOverflow ||
        offering.valuePropositionOverflow ||
        offering.brandPositionOverflow,
      targetAudience:
        audience.audienceOverflow ||
        audience.audienceNeedOverflow ||
        audience.audienceHookOverflow,
      coreOffering:
        offering.coreOfferingOverflow ||
        offering.offerFitOverflow ||
        offering.offersOverflow,
      growthOpportunity:
        opportunity.growthOpportunityOverflow ||
        opportunity.growthAngleOverflow ||
        opportunity.contentAnglesOverflow,
      meta: channels.channelsOverflow || competitors.competitorsOverflow,
    },
  };
}
