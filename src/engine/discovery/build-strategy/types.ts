import type { SeoSummary, SocialProfile } from "../brand-profile";
import type { BrandSignals, CompetitorHints } from "../types";

export type ProfileArgs = {
  website: string;
  signals: BrandSignals;
  seo: SeoSummary;
  social: SocialProfile[];
  competitorHints: CompetitorHints;
};
