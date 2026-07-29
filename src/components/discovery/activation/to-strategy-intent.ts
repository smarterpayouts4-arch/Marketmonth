import type { StrategyIntentAnswers } from "@/components/discovery/types";
import type { CadenceLevel } from "@/lib/discovery/discovery-narrative.schema";

import type { DiscoveryInvestments } from "./types";

/** Map content pillars onto legacy growthDirection ids fb-strategy understands. */
function growthDirectionFromPillar(pillarId?: string): string {
  const id = (pillarId ?? "").toLowerCase();
  if (id.includes("personal") || id.includes("fit")) return "personalized_fit";
  if (id.includes("compare") || id.includes("value") || id.includes("price")) {
    return "better_value";
  }
  if (id.includes("trust") || id.includes("decode") || id.includes("clarif")) {
    return "confidence";
  }
  return "confidence";
}

function goalFromCadence(
  cadence: CadenceLevel
): StrategyIntentAnswers["goal"] {
  if (cadence === "light") return "awareness";
  if (cadence === "active" || cadence === "daily") return "leads";
  return "awareness";
}

function thesisFromPillar(
  pillarId: string | undefined,
  contentDirectionEdit?: string
): string {
  if (contentDirectionEdit?.trim()) return contentDirectionEdit.trim().slice(0, 160);
  const id = (pillarId ?? "decode-the-decision").replace(/-/g, " ");
  return `Lead with ${id} as a repeatable content position across the month.`;
}

/**
 * Boundary adapter: new UX investments → existing strategy API contract.
 * Additive bridge - derives legacy fields so fb-strategy / prompts keep working.
 */
export function toStrategyIntentAnswers(
  investments: DiscoveryInvestments,
  defaults?: {
    reach?: StrategyIntentAnswers["reach"];
    targetLocation?: string;
    fallbackPromoteFirst?: string;
    pillarLabel?: string;
  }
): StrategyIntentAnswers {
  const promoteFirst = (
    defaults?.pillarLabel?.trim() ||
    defaults?.fallbackPromoteFirst?.trim() ||
    investments.pillarId?.replace(/-/g, " ") ||
    "Core offer"
  ).slice(0, 200);

  const growthDirection = growthDirectionFromPillar(investments.pillarId);

  return {
    goal: goalFromCadence(investments.cadenceLevel),
    promoteFirst,
    reach: defaults?.reach ?? "online_broad",
    targetLocation: defaults?.targetLocation,
    growthDirection,
    growthThesis: thesisFromPillar(
      investments.pillarId,
      investments.contentDirectionEdit
    ),
    buyerTension: undefined,
    brandCoreEdit: investments.contentDirectionEdit?.slice(0, 280),
    cadenceLevel: investments.cadenceLevel,
    channels: investments.channels,
  };
}
