import type { ReadinessAssessment } from "../readiness";
import type { DirectionProviderId } from "../providers/types";
import type { ContentBrainContext, GenerateContentDirectionsInput } from "../types";
import { blockedProvenance } from "./provenance";
import type { GenerateContentDirectionsBundle } from "./types";

export function readinessBlockedBundle(input: {
  readiness: ReadinessAssessment;
  context: ContentBrainContext;
  mode: GenerateContentDirectionsInput["mode"];
  providerId: DirectionProviderId;
}): GenerateContentDirectionsBundle | null {
  if (input.readiness.status !== "blocked") {
    return null;
  }

  return {
    result: {
      status: "blocked",
      brandName: input.context.brandName || "Unknown",
      mode: input.mode,
      missingFields: input.readiness.missingFields,
      warnings: input.readiness.warnings,
      variations: [],
    },
    provenance: blockedProvenance(input.providerId),
  };
}
