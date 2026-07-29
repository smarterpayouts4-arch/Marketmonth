import { z } from "zod";

export const llmTopicCandidateItemSchema = z.object({
  title: z.string().min(1),
  strategicAngle: z.string().min(1),
  whyItFits: z.string().min(1),
  evidenceRefs: z.array(z.string().min(1)).min(1),
  hook: z.string().optional(),
  audienceQuestion: z.string().optional(),
  suggestedFormats: z.array(z.string()).optional(),
  platformFit: z.array(z.string()).optional(),
  funnelRole: z.string().optional(),
  itchType: z.string().optional(),
  confidence: z.union([z.number(), z.string()]).optional(),
});

export const llmTopicCandidatesResponseSchema = z.object({
  candidates: z.array(llmTopicCandidateItemSchema).min(1),
});

export type LlmTopicCandidateItem = z.infer<typeof llmTopicCandidateItemSchema>;
export type LlmTopicCandidatesResponse = z.infer<
  typeof llmTopicCandidatesResponseSchema
>;

/**
 * Strict structured-output schema (constrained decoding) mirroring the zod
 * schema above. Strict mode requires every property listed in `required`,
 * so optional fields are expressed as nullable; `stripNullFields` in
 * fetch.ts normalizes nulls away before the zod parse.
 */
export const LLM_TOPIC_CANDIDATES_JSON_SCHEMA = {
  name: "topic_candidates",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["candidates"],
    properties: {
      candidates: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "title",
            "strategicAngle",
            "whyItFits",
            "evidenceRefs",
            "hook",
            "audienceQuestion",
            "suggestedFormats",
            "platformFit",
            "funnelRole",
            "itchType",
            "confidence",
          ],
          properties: {
            title: { type: "string" },
            strategicAngle: { type: "string" },
            whyItFits: { type: "string" },
            evidenceRefs: { type: "array", items: { type: "string" } },
            hook: { type: ["string", "null"] },
            audienceQuestion: { type: ["string", "null"] },
            suggestedFormats: {
              type: ["array", "null"],
              items: { type: "string" },
            },
            platformFit: {
              type: ["array", "null"],
              items: { type: "string" },
            },
            funnelRole: { type: ["string", "null"] },
            itchType: { type: ["string", "null"] },
            confidence: {
              anyOf: [{ type: "number" }, { type: "string" }, { type: "null" }],
            },
          },
        },
      },
    },
  },
} as const;
