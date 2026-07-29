import { z } from "zod";

import {
  callBrainLlm,
  type BrainLlmJsonSchema,
} from "@/brain/llm/openai-client";
import { resolveModel } from "@/brain/policy/model-registry";

/**
 * LLM-as-judge on sampled runs (P3.1).
 * Judges a finished candidate slate for grounding/specificity/usefulness.
 * Advisory only: results are stamped into traces for drift monitoring and
 * never change what the user was shown.
 */

export const TOPIC_JUDGE_VERSION = "topic-judge-v1";

const judgeResponseSchema = z.object({
  scores: z
    .array(
      z.object({
        title: z.string(),
        grounded: z.number().min(0).max(10),
        specific: z.number().min(0).max(10),
        useful: z.number().min(0).max(10),
      })
    )
    .min(1),
  overall: z.number().min(0).max(10),
  notes: z.string().max(600),
});

export type TopicJudgeResult = z.infer<typeof judgeResponseSchema> & {
  judgeVersion: string;
  model: string;
};

const JUDGE_JSON_SCHEMA: BrainLlmJsonSchema = {
  name: "topic_judge_v1",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["scores", "overall", "notes"],
    properties: {
      scores: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "grounded", "specific", "useful"],
          properties: {
            title: { type: "string" },
            grounded: { type: "number" },
            specific: { type: "number" },
            useful: { type: "number" },
          },
        },
      },
      overall: { type: "number" },
      notes: { type: "string" },
    },
  },
};

/** Sample gate: BRAIN_JUDGE_SAMPLE_RATE in [0,1]; default 0 (off). */
export function shouldSampleJudge(random: () => number = Math.random): boolean {
  const rate = Number(process.env.BRAIN_JUDGE_SAMPLE_RATE);
  if (!Number.isFinite(rate) || rate <= 0) return false;
  return random() < Math.min(1, rate);
}

/** Exported for tests: strict parse of a raw judge response. */
export function parseJudgeResponse(
  raw: string
): z.infer<typeof judgeResponseSchema> | null {
  try {
    const parsed = judgeResponseSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function judgeTopicCandidates(args: {
  brandName: string;
  categoryId: string;
  candidates: Array<{ title: string; strategicAngle?: string }>;
  /** Tenant scope for cost caps. */
  companyId?: string;
}): Promise<TopicJudgeResult | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey || args.candidates.length === 0) return null;
  const model = resolveModel("topicLlmCandidates");

  const system = [
    "You are a strict marketing-content judge.",
    "Score each topic candidate 0-10 on three axes:",
    "- grounded: does the title avoid invented facts, numbers, or claims?",
    "- specific: does it name something concrete rather than a vague category?",
    "- useful: would the stated audience actually click and learn something?",
    "Also return an overall 0-10 and one-paragraph notes.",
    "Return JSON only matching the provided schema.",
  ].join("\n");

  const user = [
    `Brand: ${args.brandName}`,
    `Category: ${args.categoryId}`,
    "Candidates:",
    ...args.candidates.map(
      (c, i) =>
        `${i + 1}. ${c.title}${c.strategicAngle ? ` — angle: ${c.strategicAngle}` : ""}`
    ),
  ].join("\n");

  const result = await callBrainLlm({
    apiKey,
    model,
    system,
    user,
    jsonSchema: JUDGE_JSON_SCHEMA,
    costScope: args.companyId ? { companyId: args.companyId } : undefined,
  });
  if (!result.ok) return null;

  const parsed = parseJudgeResponse(result.raw);
  if (!parsed) return null;
  return { ...parsed, judgeVersion: TOPIC_JUDGE_VERSION, model };
}
