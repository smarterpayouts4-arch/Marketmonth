import { z } from "zod";

import { MARKETING_FOCUS_VALUES } from "@/brain/content/marketing-focus";
import { normalizeInputTopic } from "@/brain/content/normalize-topic";

/** Lean contract: Lab + product + history share one normalized topic shape. */
export const NORMALIZED_TOPIC_SCHEMA_VERSION = "normalized-topic-v1" as const;

export const normalizedTopicSchema = z.object({
  schemaVersion: z.literal(NORMALIZED_TOPIC_SCHEMA_VERSION),
  originalInput: z.string(),
  normalizedTitle: z.string().min(1),
  audience: z.string().optional(),
  objective: z.enum(MARKETING_FOCUS_VALUES).optional(),
  productOrSubject: z.string().optional(),
  constraints: z.array(z.string()).default([]),
  completeness: z.enum(["complete", "partial", "insufficient"]),
  confidence: z.enum(["high", "medium", "low"]),
});

export type NormalizedTopic = z.infer<typeof normalizedTopicSchema>;

export function buildNormalizedTopic(input: {
  originalInput: string;
  audience?: string;
  objective?: (typeof MARKETING_FOCUS_VALUES)[number];
  productOrSubject?: string;
  constraints?: string[];
  completeness?: NormalizedTopic["completeness"];
  confidence?: NormalizedTopic["confidence"];
}): NormalizedTopic {
  const normalizedTitle = normalizeInputTopic(input.originalInput);
  return normalizedTopicSchema.parse({
    schemaVersion: NORMALIZED_TOPIC_SCHEMA_VERSION,
    originalInput: input.originalInput,
    normalizedTitle: normalizedTitle || input.originalInput.trim(),
    audience: input.audience,
    objective: input.objective,
    productOrSubject: input.productOrSubject,
    constraints: input.constraints ?? [],
    completeness: input.completeness ?? (normalizedTitle ? "complete" : "insufficient"),
    confidence: input.confidence ?? "medium",
  });
}
