/**
 * Single surface for Content Brain model / provider env defaults.
 * Application policy — not doctrine. Do not put Project Knowledge paths here.
 */

export const MODEL_REGISTRY = {
  directionsIntelligent: {
    env: "OPENAI_DIRECTIONS_MODEL",
    default: "gpt-5-nano",
  },
  contentAtomLlm: {
    env: "OPENAI_CONTENT_BRAIN_MODEL",
    fallbackEnv: "OPENAI_DISCOVERY_MODEL",
    default: "gpt-4o-mini",
  },
  hookEnrichment: {
    env: "OPENAI_HOOK_ENRICHMENT_MODEL",
    default: "gpt-5-nano",
  },
  topicTitlePolish: {
    env: "OPENAI_TOPIC_TITLE_POLISH_MODEL",
    default: "gpt-5-nano",
  },
  discovery: {
    env: "OPENAI_DISCOVERY_MODEL",
    default: "gpt-5.4-nano",
  },
} as const;

export type ModelRegistryKey = keyof typeof MODEL_REGISTRY;

export function resolveModel(key: ModelRegistryKey | string): string {
  if (!(key in MODEL_REGISTRY)) {
    throw new Error(`Unknown model-policy entry: ${String(key)}`);
  }
  const entry = MODEL_REGISTRY[key as ModelRegistryKey];
  const primary = process.env[entry.env]?.trim();
  if (primary) return primary;
  if ("fallbackEnv" in entry && entry.fallbackEnv) {
    const fallback = process.env[entry.fallbackEnv]?.trim();
    if (fallback) return fallback;
  }
  return entry.default;
}
