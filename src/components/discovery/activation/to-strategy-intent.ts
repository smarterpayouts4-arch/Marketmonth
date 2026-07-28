import type { StrategyIntentAnswers } from "@/components/discovery/types";

import type { DiscoveryInvestments } from "./types";

/**
 * Boundary adapter: new UX investments → existing strategy API contract.
 * Keeps server terminology out of the permanent product language.
 */
export function toStrategyIntentAnswers(
  investments: DiscoveryInvestments,
  defaults?: {
    reach?: StrategyIntentAnswers["reach"];
    targetLocation?: string;
    fallbackPromoteFirst?: string;
  }
): StrategyIntentAnswers {
  const promoteFirst = (
    investments.leadOffer?.trim() ||
    defaults?.fallbackPromoteFirst?.trim() ||
    "Core offer"
  ).slice(0, 200);

  return {
    goal: investments.strategyGoal,
    promoteFirst,
    reach: defaults?.reach ?? "online_broad",
    targetLocation: defaults?.targetLocation,
    growthDirection: investments.growthDirection,
    growthThesis: investments.growthThesis,
    buyerTension: investments.buyerTension,
    brandCoreEdit: investments.brandCoreEdit,
  };
}
