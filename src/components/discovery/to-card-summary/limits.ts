/**
 * Presentation caps for Discovery landing card.
 * Body limits are generous so ordinary copy scrolls as complete sentences.
 * Read more appears only when content exceeds these exceptional-detail thresholds.
 */
export const LIMITS = {
  businessName: 48,
  /** Exceptional-detail threshold — below this, full text scrolls in-card. */
  business: 480,
  valueProposition: 360,
  audience: 480,
  audienceNeed: 360,
  audienceHook: 360,
  coreOffering: 480,
  offerFit: 360,
  brandPosition: 360,
  growthOpportunity: 480,
  growthAngle: 360,
  competitorName: 40,
} as const;

/** Max items shown inline before meta “View all”. */
export const META_VISIBLE = {
  channels: 4,
  competitors: 3,
} as const;

export const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  youtube: "YouTube",
  x: "X",
};

/** Long-form / self-publish channels we can wire for article distribution later. */
export const ARTICLE_PLATFORM_HINTS = [
  { id: "medium", label: "Medium", re: /medium\.com/i },
  { id: "substack", label: "Substack", re: /substack\.com/i },
] as const;
