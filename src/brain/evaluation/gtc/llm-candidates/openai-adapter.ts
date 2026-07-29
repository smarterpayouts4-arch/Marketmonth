import {
  callBrainLlm,
  type BrainLlmTokenUsage,
} from "@/brain/llm/openai-client";

import { LLM_TOPIC_CANDIDATES_JSON_SCHEMA } from "./schema";

export type OpenAiTopicCandidatesCallResult =
  | {
      ok: true;
      raw: string;
      tokenUsage?: BrainLlmTokenUsage;
    }
  | {
      ok: false;
      reason: "timeout" | "api_error";
      detail: string;
    };

export type TopicCandidatesLlmCallArgs = {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  /** Tenant scope for P2.2 daily cost caps. */
  costScope?: { companyId: string };
};

export type TopicCandidatesLlmAdapter = (
  args: TopicCandidatesLlmCallArgs
) => Promise<OpenAiTopicCandidatesCallResult>;

let adapterOverride: TopicCandidatesLlmAdapter | null = null;

/** Test seam: inject a fake LLM adapter (pass null to restore). */
export function setTopicCandidatesLlmAdapterForTests(
  adapter: TopicCandidatesLlmAdapter | null
): void {
  adapterOverride = adapter;
}

export function getTopicCandidatesLlmAdapter(): TopicCandidatesLlmAdapter {
  return adapterOverride ?? callTopicCandidatesOpenAi;
}

/**
 * Topic-candidates adapter over the shared brain LLM client:
 * strict json_schema structured output, 30s timeout, bounded retries.
 */
export async function callTopicCandidatesOpenAi(
  args: TopicCandidatesLlmCallArgs
): Promise<OpenAiTopicCandidatesCallResult> {
  const result = await callBrainLlm({
    apiKey: args.apiKey,
    model: args.model,
    system: args.system,
    user: args.user,
    jsonSchema: LLM_TOPIC_CANDIDATES_JSON_SCHEMA,
    costScope: args.costScope,
  });
  if (result.ok) {
    return { ok: true, raw: result.raw, tokenUsage: result.tokenUsage };
  }
  return { ok: false, reason: result.reason, detail: result.detail };
}
