/**
 * Legacy shared landing fixtures.
 * Prefer `@/components/landing/landing-copy` and
 * `@/seo/config/public-positioning` for visitor-facing product claims.
 */

import {
  PUBLIC_DIFFERENTIATORS,
  PUBLIC_ILLUSTRATIVE_STATS,
  PUBLIC_PROCESS,
  PUBLIC_WHAT_YOU_GET,
} from "@/seo/config/public-positioning";

/** Unique local assets - one photo per purpose, no logo renders. */
export const landingImagery = {
  tiktok: "/landing/tiktok.jpg",
  instagram: "/landing/instagram.jpg",
  youtube: "/landing/youtube.jpg",
  article: "/landing/article.jpg",
  month: "/landing/month.jpg",
  linkedin: "/landing/linkedin.jpg",
  facebook: "/landing/facebook.jpg",
  planning: "/landing/planning.jpg",
} as const;

/** @deprecated Prefer landingCopy.differentiators */
export const whyDifferent = PUBLIC_DIFFERENTIATORS;

/** @deprecated Prefer landingCopy.whatYouGet */
export const whatYouGet = PUBLIC_WHAT_YOU_GET;

/** @deprecated Prefer processSteps from landing-copy */
export const howItWorksSteps = PUBLIC_PROCESS.steps;

/**
 * Kept for SocialProof component compatibility only.
 * Fictional testimonials are removed from the conversion path.
 */
export const illustrativeProof = {
  disclaimer:
    "Illustrative demo content - not real customer testimonials or ratings.",
  quotes: [] as readonly {
    quote: string;
    attribution: string;
  }[],
  stats: PUBLIC_ILLUSTRATIVE_STATS,
} as const;
