import type { TopicCategoryId } from "@/brain/content/topic-category";
import type { ContentBrainContext } from "@/brain/content/types";
import { resolveModel } from "@/brain/policy/model-registry";

import type { TopicEvidenceItem } from "../../evidence/types";
import { buildTopicCandidatePrompt } from "./build-prompt";
import { getTopicCandidatesLlmAdapter } from "./openai-adapter";
import { buildTopicCandidatesSystemInstruction } from "./playbook";
import { llmTopicCandidatesResponseSchema } from "./schema";
import {
  TOPIC_LLM_VALIDATOR_VERSION,
  type FetchLlmTopicCandidatesResult,
  type LlmCandidateRejection,
  type TopicLlmFailureReason,
  type ValidatedLlmTopicCandidate,
} from "./types";
import { validateLlmTopicCandidate } from "./validate";

/**
 * Strict structured output expresses optional fields as nullable; the zod
 * schema models them as absent. Drop null-valued keys so both align.
 */
function stripNullFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripNullFields);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== null)
        .map(([k, v]) => [k, stripNullFields(v)])
    );
  }
  return value;
}

type TokenUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

function sumTokenUsage(
  a: TokenUsage | undefined,
  b: TokenUsage | undefined
): TokenUsage | undefined {
  if (!a) return b;
  if (!b) return a;
  const add = (x?: number, y?: number) =>
    x === undefined && y === undefined ? undefined : (x ?? 0) + (y ?? 0);
  return {
    promptTokens: add(a.promptTokens, b.promptTokens),
    completionTokens: add(a.completionTokens, b.completionTokens),
    totalTokens: add(a.totalTokens, b.totalTokens),
  };
}

type AttemptOutcome =
  | {
      kind: "transport_fail";
      reason: TopicLlmFailureReason;
      detail: string;
      tokenUsage?: TokenUsage;
    }
  | {
      kind: "bad_response";
      reason: "invalid_json" | "schema_mismatch";
      detail: string;
      tokenUsage?: TokenUsage;
    }
  | {
      kind: "validated";
      accepted: ValidatedLlmTopicCandidate[];
      rejections: LlmCandidateRejection[];
      tokenUsage?: TokenUsage;
    };

export async function fetchLlmTopicCandidates(args: {
  context: ContentBrainContext;
  categoryId: TopicCategoryId;
  evidenceItems: TopicEvidenceItem[];
  /** Prompt A/B arm (P3.1). Default control. */
  promptVariant?: import("@/brain/policy/prompt-experiments").PromptVariant;
}): Promise<FetchLlmTopicCandidatesResult> {
  const model = resolveModel("topicLlmCandidates");
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, reason: "missing_api_key", model };
  }

  if (args.evidenceItems.length === 0) {
    return {
      ok: false,
      reason: "no_eligible_candidates",
      detail: "no evidence items supplied",
      model,
    };
  }

  const promptBundle = buildTopicCandidatePrompt({
    context: args.context,
    categoryId: args.categoryId,
    evidenceItems: args.evidenceItems,
  });
  const system = buildTopicCandidatesSystemInstruction(
    args.categoryId,
    args.promptVariant ?? "control"
  );
  const evidenceById = new Map(
    args.evidenceItems.map((item) => [item.id, item])
  );

  const callLlm = getTopicCandidatesLlmAdapter();
  const costScope = args.context.domain
    ? { companyId: args.context.domain }
    : undefined;
  const attempt = async (userPrompt: string): Promise<AttemptOutcome> => {
    const api = await callLlm({
      apiKey,
      model,
      system,
      user: userPrompt,
      costScope,
    });
    if (!api.ok) {
      return { kind: "transport_fail", reason: api.reason, detail: api.detail };
    }
    if (!api.raw.trim()) {
      return {
        kind: "bad_response",
        reason: "invalid_json",
        detail: "empty model content",
        tokenUsage: api.tokenUsage,
      };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(api.raw);
    } catch (err) {
      return {
        kind: "bad_response",
        reason: "invalid_json",
        detail: err instanceof Error ? err.message : "JSON parse failed",
        tokenUsage: api.tokenUsage,
      };
    }

    const schemaResult = llmTopicCandidatesResponseSchema.safeParse(
      stripNullFields(parsed)
    );
    if (!schemaResult.success) {
      return {
        kind: "bad_response",
        reason: "schema_mismatch",
        detail: schemaResult.error.issues[0]?.message ?? "schema mismatch",
        tokenUsage: api.tokenUsage,
      };
    }

    const accepted: ValidatedLlmTopicCandidate[] = [];
    const rejections: LlmCandidateRejection[] = [];
    for (const candidate of schemaResult.data.candidates) {
      const validated = validateLlmTopicCandidate({
        candidate,
        sentEvidenceIds: promptBundle.sentEvidenceIds,
        displayToRealId: promptBundle.displayToRealId,
        evidenceById,
        allEvidenceItems: args.evidenceItems,
        categoryId: args.categoryId,
      });
      if (validated.ok) {
        accepted.push(validated.value);
      } else {
        rejections.push({
          code: validated.code,
          title: candidate.title,
          detail: validated.reason,
        });
      }
    }
    return { kind: "validated", accepted, rejections, tokenUsage: api.tokenUsage };
  };

  const first = await attempt(promptBundle.userPrompt);

  if (first.kind === "transport_fail") {
    return { ok: false, reason: first.reason, detail: first.detail, model };
  }

  if (first.kind === "validated" && first.accepted.length > 0) {
    return {
      ok: true,
      candidates: first.accepted,
      model,
      tokenUsage: first.tokenUsage,
      validatorVersion: TOPIC_LLM_VALIDATOR_VERSION,
      rejections: first.rejections.length ? first.rejections : undefined,
    };
  }

  // One-shot repair retry: feed the concrete validation errors back so the
  // model can correct itself instead of silently falling back (P1.3).
  const problems =
    first.kind === "bad_response"
      ? [`${first.reason}: ${first.detail}`]
      : first.rejections
          .slice(0, 6)
          .map((r) => `"${r.title}" rejected (${r.code}): ${r.detail}`);
  const repairPrompt = [
    promptBundle.userPrompt,
    "",
    "REPAIR PASS — your previous response failed validation:",
    ...problems.map((p) => `- ${p}`),
    "Fix every issue and return corrected JSON that follows all rules above. Do not repeat rejected titles unchanged.",
  ].join("\n");

  const second = await attempt(repairPrompt);
  const tokenUsage = sumTokenUsage(first.tokenUsage, second.tokenUsage ?? undefined);

  if (second.kind === "validated" && second.accepted.length > 0) {
    return {
      ok: true,
      candidates: second.accepted,
      model,
      tokenUsage,
      validatorVersion: TOPIC_LLM_VALIDATOR_VERSION,
      rejections: second.rejections.length ? second.rejections : undefined,
      repairUsed: true,
    };
  }

  if (second.kind === "transport_fail") {
    return {
      ok: false,
      reason: second.reason,
      detail: second.detail,
      model,
      validatorVersion: TOPIC_LLM_VALIDATOR_VERSION,
      repairUsed: true,
    };
  }

  if (second.kind === "bad_response") {
    return {
      ok: false,
      reason: second.reason,
      detail: second.detail,
      model,
      tokenUsage,
      validatorVersion: TOPIC_LLM_VALIDATOR_VERSION,
      repairUsed: true,
    };
  }

  return {
    ok: false,
    reason: "grounding_rejected",
    detail:
      second.rejections
        .slice(0, 5)
        .map((r) => `${r.title}: ${r.detail}`)
        .join("; ") || "all candidates rejected",
    model,
    tokenUsage,
    validatorVersion: TOPIC_LLM_VALIDATOR_VERSION,
    rejections: second.rejections,
    repairUsed: true,
  };
}
