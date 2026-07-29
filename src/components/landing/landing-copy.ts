/**
 * Landing UI copy - consumes the approved public positioning source.
 * Do not invent product claims here; change public-positioning.ts instead.
 */

import {
  PUBLIC_DIFFERENTIATORS,
  PUBLIC_ILLUSTRATIVE_STATS,
  PUBLIC_POSITIONING,
  PUBLIC_PROCESS,
  PUBLIC_WHAT_YOU_GET,
} from "@/seo/config/public-positioning";

export const landingCopy = {
  positioning: PUBLIC_POSITIONING,
  process: PUBLIC_PROCESS,
  differentiators: PUBLIC_DIFFERENTIATORS,
  whatYouGet: PUBLIC_WHAT_YOU_GET,
  illustrativeStats: PUBLIC_ILLUSTRATIVE_STATS,
} as const;

export const {
  heroHeadline,
  heroSubhead,
  painLine,
  primaryCta,
  secondaryCta,
  freeAnalysisLine,
  freeAnalysisNote,
  discoveryTitle,
  discoverySubhead,
  finalCtaHeadline,
  finalCtaSubhead,
  whyDifferentHeading,
  whyDifferentEyebrow,
  whatYouGetEyebrow,
  whatYouGetHeading,
  contentUniverseBadge,
  contentUniverseHeadline,
  contentUniverseSubhead,
  contentUniverseDisclaimer,
  monthPlanEyebrow,
  monthPlanHeadline,
  monthPlanBody,
  capabilityBoundaryHeading,
  capabilityBoundarySubhead,
} = PUBLIC_POSITIONING;

export const processLabel = PUBLIC_PROCESS.label;
export const processSteps = PUBLIC_PROCESS.steps;
