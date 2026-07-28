import type { SeoRecommendation } from "../contracts/recommendation";

const IMPACT_ORDER = { High: 0, Medium: 1, Low: 2, None: 3 } as const;

export function prioritizeRecommendations(
  items: SeoRecommendation[]
): SeoRecommendation[] {
  return [...items].sort((a, b) => {
    const impact = IMPACT_ORDER[a.impact] - IMPACT_ORDER[b.impact];
    if (impact !== 0) return impact;
    return a.createdAt.localeCompare(b.createdAt);
  });
}
