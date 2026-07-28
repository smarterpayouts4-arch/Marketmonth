import {
  isKnownDirectionsProvider,
  resolveProvider,
} from "@/brain/content/providers/resolve-provider";
import type {
  DirectionProvider,
  DirectionProviderId,
} from "@/brain/content/providers/types";

/** Product / Lab directions provider selection — one policy module. */
export const PRODUCT_DEFAULT_DIRECTIONS_PROVIDER: DirectionProviderId =
  "deterministic-v1";

/** Idea Lab directions always use the frozen deterministic provider (ADR 0002). */
export const IDEA_LAB_DIRECTIONS_PROVIDER: DirectionProviderId =
  "deterministic-v1";

/**
 * Product Atom path: deterministic only (cost + stability).
 * LLM atom remains available for experiments via preferLlm on the pipeline.
 */
export const PRODUCT_ATOM_PREFER_LLM = false;

/** Canonical provider-selection entry points (boundary tests). */
export const ALLOWED_PROVIDER_SELECTION_ENTRYPOINTS = [
  "src/brain/policy/provider-policy.ts",
  "src/brain/content/providers/resolve-provider.ts",
] as const;

export function selectDirectionsProvider(
  preferred?: DirectionProviderId | string
): DirectionProvider {
  const id = preferred ?? PRODUCT_DEFAULT_DIRECTIONS_PROVIDER;
  if (!isKnownDirectionsProvider(id)) {
    throw new Error(`Unknown directions provider: ${String(preferred)}`);
  }
  return resolveProvider(id);
}

/** Idea Lab always resolves via shared policy (not a second selector). */
export function selectIdeaLabDirectionsProvider(): DirectionProvider {
  return selectDirectionsProvider(IDEA_LAB_DIRECTIONS_PROVIDER);
}
