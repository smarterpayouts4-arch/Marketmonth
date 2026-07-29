import { getPromptEntry } from "./prompt-registry";

/**
 * Prompt A/B by version (P3.1).
 *
 * Assignment is deterministic per unit key (usually companyId) so a tenant
 * sees a consistent variant, and the assigned version string is stamped into
 * traces/history — runs are attributable to the exact prompt that produced
 * them.
 *
 * Env control per prompt id (non-alphanumerics become "_", uppercased):
 *   PROMPT_EXPERIMENT_TOPIC_LLM_CANDIDATES=off | b | split
 * - off / unset → everyone gets control.
 * - b → everyone gets variant B (canary).
 * - split → stable 50/50 hash split by unit key.
 */

export type PromptVariant = "control" | "b";

export type PromptExperimentAssignment = {
  promptId: string;
  variant: PromptVariant;
  /** Registry version, suffixed with "+exp-b" for the B arm. */
  version: string;
};

export function experimentEnvName(promptId: string): string {
  return `PROMPT_EXPERIMENT_${promptId.replace(/[^a-zA-Z0-9]+/g, "_").toUpperCase()}`;
}

/** FNV-1a — stable, dependency-free unit hashing. */
function hashUnit(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function assignPromptVariant(
  promptId: string,
  unitKey: string
): PromptExperimentAssignment {
  const entry = getPromptEntry(promptId);
  const mode = process.env[experimentEnvName(promptId)]?.trim().toLowerCase();

  let variant: PromptVariant = "control";
  if (mode === "b") {
    variant = "b";
  } else if (mode === "split") {
    variant = hashUnit(unitKey) % 2 === 1 ? "b" : "control";
  }

  return {
    promptId,
    variant,
    version: variant === "b" ? `${entry.version}+exp-b` : entry.version,
  };
}
