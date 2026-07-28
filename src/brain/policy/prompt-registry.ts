import type { DirectionProviderId } from "@/brain/content/providers/types";

import {
  PRODUCT_ATOM_PREFER_LLM,
  PRODUCT_DEFAULT_DIRECTIONS_PROVIDER,
  IDEA_LAB_DIRECTIONS_PROVIDER,
} from "./provider-policy";
import type { ModelRegistryKey } from "./model-registry";

/**
 * Metadata + module pointers only. Prompt text stays near owning capability.
 */
export type PromptRegistryEntry = {
  id: string;
  version: string;
  workflowStage: string;
  /** Module path that owns prompt construction */
  promptModule: string;
  providerPolicy: DirectionProviderId | "n/a" | "ask-openai" | "deterministic-atom";
  modelPolicy: ModelRegistryKey | "none";
  outputSchema: string;
  fallback: string;
};

export const PROMPT_REGISTRY: readonly PromptRegistryEntry[] = [
  {
    id: "directions.intelligent-v1",
    version: "intelligent-directions-v1",
    workflowStage: "six_direction_generation",
    promptModule: "src/brain/content/providers/intelligent-v1/prompt.ts",
    providerPolicy: "intelligent-v1",
    modelPolicy: "directionsIntelligent",
    outputSchema: "intelligentDirectionsResultSchema",
    fallback: "deterministic-v1",
  },
  {
    id: "directions.deterministic-v1",
    version: "deterministic-directions-v2",
    workflowStage: "six_direction_generation",
    promptModule: "src/brain/content/gcd (deterministic — no LLM prompt)",
    providerPolicy: PRODUCT_DEFAULT_DIRECTIONS_PROVIDER,
    modelPolicy: "none",
    outputSchema: "ContentDirectionResult",
    fallback: "none",
  },
  {
    id: "directions.idea-lab",
    version: "deterministic-directions-v2",
    workflowStage: "idea_lab_directions",
    promptModule: "src/brain/content/gcd (deterministic — no LLM prompt)",
    providerPolicy: IDEA_LAB_DIRECTIONS_PROVIDER,
    modelPolicy: "none",
    outputSchema: "ContentDirectionResult",
    fallback: "none",
  },
  {
    id: "topic.title-polish",
    version: "topic-title-polish-v1",
    workflowStage: "topic_title_hook",
    promptModule:
      "src/brain/evaluation/gtc/topic-title-polish/playbook.ts",
    providerPolicy: "n/a",
    modelPolicy: "topicTitlePolish",
    outputSchema: "topic-title-polish result",
    fallback: "deterministic remap (product policy)",
  },
  {
    id: "atom.core-llm",
    version: "core-content-brain-v1",
    workflowStage: "content_atom",
    promptModule: "src/brain/pipeline/prompts.ts",
    providerPolicy: PRODUCT_ATOM_PREFER_LLM
      ? "n/a"
      : "deterministic-atom",
    modelPolicy: "contentAtomLlm",
    outputSchema: "contentAtomSchema",
    fallback: "deterministic atom builder",
  },
  {
    id: "channel.youtube-short",
    version: "youtube-short-specialist-v1",
    workflowStage: "youtube_short",
    promptModule: "src/brain/channels/youtube-short/prompt.ts",
    providerPolicy: "deterministic-atom",
    modelPolicy: "none",
    outputSchema: "youtubeShortPackageSchema",
    fallback: "none (specialist is deterministic)",
  },
  {
    id: "ask.project-knowledge",
    version: "project-knowledge-ask-v1",
    workflowStage: "project_knowledge_ask",
    promptModule: "src/lib/project-knowledge/ask-prompt.ts",
    providerPolicy: "ask-openai",
    modelPolicy: "discovery",
    outputSchema: "ask JSON { answer, sources }",
    fallback: "503 if OPENAI_API_KEY missing",
  },
  {
    id: "eval.draft-deterministic",
    version: "draft-eval-v1",
    workflowStage: "draft_evaluation",
    promptModule: "src/brain/evaluation/draft-eval/evaluate-draft.ts",
    providerPolicy: "n/a",
    modelPolicy: "none",
    outputSchema: "evaluationResultSchema",
    fallback: "human_review on FAIL",
  },
] as const;

export function assertPromptRegistryValid(
  entries: readonly PromptRegistryEntry[] = PROMPT_REGISTRY
): void {
  const seen = new Set<string>();
  for (const entry of entries) {
    if (!entry.id || !entry.version) {
      throw new Error(`Prompt registry entry missing id/version: ${JSON.stringify(entry)}`);
    }
    if (seen.has(entry.id)) {
      throw new Error(`Duplicate prompt ID: ${entry.id}`);
    }
    seen.add(entry.id);
  }
}

export function getPromptEntry(id: string): PromptRegistryEntry {
  const entry = PROMPT_REGISTRY.find((e) => e.id === id);
  if (!entry) {
    throw new Error(`Unknown prompt id: ${id}`);
  }
  return entry;
}
