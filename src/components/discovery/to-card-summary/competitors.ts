import type { BrandProfileView } from "@/components/discovery/types";

import { LIMITS, META_VISIBLE } from "./limits";
import { clamp, stripDashes } from "./text";

export type CompetitorsMapped = {
  suggestedCompetitors: string[];
  suggestedCompetitorsFull: string[];
  competitorsOverflow: boolean;
};

export function mapCompetitors(profile: BrandProfileView): CompetitorsMapped {
  const suggestedCompetitorsFull = profile.competitors
    .map((c) => stripDashes(c.name))
    .filter(Boolean);

  const suggestedCompetitors = suggestedCompetitorsFull
    .map((name) => clamp(name, LIMITS.competitorName))
    .slice(0, META_VISIBLE.competitors);

  const competitorsOverflow =
    suggestedCompetitorsFull.length > suggestedCompetitors.length ||
    suggestedCompetitorsFull.some(
      (name, i) =>
        i < suggestedCompetitors.length &&
        clamp(name, LIMITS.competitorName) !== name
    );

  return {
    suggestedCompetitors,
    suggestedCompetitorsFull,
    competitorsOverflow,
  };
}
