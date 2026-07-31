/**
 * Central soft caps for Content Brain LLM completion tokens.
 * Wired to `max_completion_tokens` via callBrainLlm / OpenAI clients.
 * gpt-5.4-nano supports up to 128k output; these are operational ceilings.
 */

export const TOKEN_BUDGETS = {
  atom: 40_000,
  atomCraftPolish: 16_000,
  topicCandidates: 16_000,
  hookEnrichment: 4_000,
  discoveryProfile: 16_000,
  discoveryStrategy: 16_000,
  discoveryCopyPolish: 8_000,
  /** Short Manual paste-prompt → four scene fields (Phase 3F: long visuals). */
  shortSceneIngest: 4_000,
} as const;

export type TokenBudgetKey = keyof typeof TOKEN_BUDGETS;

export function tokenBudget(key: TokenBudgetKey): number {
  return TOKEN_BUDGETS[key];
}
