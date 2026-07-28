import { deterministicProvider } from "./deterministic-provider";
import { intelligentV1Provider } from "./intelligent-v1/provider";
import type { DirectionProvider, DirectionProviderId } from "./types";

const KNOWN: ReadonlySet<DirectionProviderId> = new Set([
  "deterministic-v1",
  "intelligent-v1",
]);

/**
 * Selectable Directions providers only.
 * Legacy openai-stub is not selectable. Unknown ids fail closed.
 */
export function resolveProvider(
  preferred?: DirectionProviderId
): DirectionProvider {
  const id = preferred ?? "deterministic-v1";
  if (!KNOWN.has(id)) {
    throw new Error(`Unknown directions provider: ${String(preferred)}`);
  }
  if (id === "intelligent-v1") return intelligentV1Provider;
  return deterministicProvider;
}

export function isKnownDirectionsProvider(
  id: string
): id is DirectionProviderId {
  return KNOWN.has(id as DirectionProviderId);
}
