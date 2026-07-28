import OpenAI from "openai";
import { z } from "zod";

import { resolveModel } from "@/brain/policy/model-registry";

import { buildTopicTitlePolishMessages } from "./build-prompt";
import type {
  TitlePolishFailureReason,
  TopicTitlePolishInput,
  TopicTitlePolishOutput,
} from "./types";
import { TOPIC_TITLE_POLISH_VERSION } from "./types";

const polishReasonSchema = z.enum([
  "grammar",
  "objective_framing",
  "concreteness",
  "rhythm",
  "duplicate_reduction",
  "unchanged",
]);

const polishOutputSchema = z.object({
  version: z.literal(TOPIC_TITLE_POLISH_VERSION),
  candidates: z
    .array(
      z.object({
        candidateId: z.string().min(1),
        polishedTitle: z.string().min(1).max(120),
        polishReason: polishReasonSchema,
      })
    )
    .min(1)
    .max(6),
});

export type PolishTitlesWithOpenAIResult =
  | { ok: true; value: TopicTitlePolishOutput }
  | { ok: false; reason: TitlePolishFailureReason; detail?: string };

/**
 * One batch OpenAI call for all six titles.
 */
export async function polishTitlesWithOpenAI(
  input: TopicTitlePolishInput
): Promise<PolishTitlesWithOpenAIResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, reason: "missing_api_key" };
  }
  if (input.candidates.length === 0) {
    return { ok: false, reason: "no_eligible_candidates" };
  }

  const model = resolveModel("topicTitlePolish");

  const { system, user } = buildTopicTitlePolishMessages(input);

  try {
    const client = new OpenAI({ apiKey });
    // gpt-5-nano / reasoning models reject custom temperature — omit for default.
    const completion = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "";
    if (!raw.trim()) {
      return {
        ok: false,
        reason: "invalid_json",
        detail: "empty model content",
      };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      return {
        ok: false,
        reason: "invalid_json",
        detail: err instanceof Error ? err.message : "JSON.parse failed",
      };
    }

    const result = polishOutputSchema.safeParse(parsed);
    if (!result.success) {
      return {
        ok: false,
        reason: "schema_mismatch",
        detail: result.error.issues[0]?.message ?? "schema mismatch",
      };
    }

    const ids = new Set(input.candidates.map((c) => c.candidateId));
    const outIds = result.data.candidates.map((c) => c.candidateId);
    if (outIds.length !== ids.size) {
      return {
        ok: false,
        reason: "candidate_id_mismatch",
        detail: `expected ${ids.size} ids, got ${outIds.length}`,
      };
    }
    if (outIds.some((id) => !ids.has(id))) {
      return {
        ok: false,
        reason: "candidate_id_mismatch",
        detail: "unknown candidateId in model output",
      };
    }
    if (new Set(outIds).size !== outIds.length) {
      return {
        ok: false,
        reason: "candidate_id_mismatch",
        detail: "duplicate candidateId in model output",
      };
    }

    return { ok: true, value: result.data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status =
      typeof err === "object" &&
      err !== null &&
      "status" in err &&
      typeof (err as { status?: unknown }).status === "number"
        ? (err as { status: number }).status
        : undefined;
    if (
      /timeout|timed out|ETIMEDOUT|AbortError/i.test(message) ||
      status === 408 ||
      status === 504
    ) {
      return { ok: false, reason: "timeout", detail: message };
    }
    return { ok: false, reason: "api_error", detail: message };
  }
}

export function resolvePolishModel(): string {
  return resolveModel("topicTitlePolish");
}
