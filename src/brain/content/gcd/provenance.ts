import type { DirectionProviderId, DirectionsProviderProvenance } from "../providers/types";

export function blockedProvenance(
  providerId: DirectionProviderId,
  promptVersion: string | null = null
): DirectionsProviderProvenance {
  return {
    provider_id: providerId,
    brain_version: providerId,
    prompt_version:
      promptVersion ??
      (providerId === "deterministic-v1" ? "none" : null),
    model: null,
  };
}
