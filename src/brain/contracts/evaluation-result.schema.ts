import { z } from "zod";

export const EVALUATION_RESULT_SCHEMA_VERSION = "evaluation-result-v1" as const;

export const evaluationMetricStatusSchema = z.enum([
  "PASS",
  "FAIL",
  "WARNING",
]);

export const evaluationMetricResultSchema = z.object({
  id: z.string().min(1),
  status: evaluationMetricStatusSchema,
  evidence: z.array(z.string()),
  message: z.string(),
  revisionInstruction: z.string().optional(),
});

export const evaluationResultSchema = z.object({
  schemaVersion: z.literal(EVALUATION_RESULT_SCHEMA_VERSION),
  artifactId: z.string().min(1),
  evaluatorVersion: z.string().min(1),
  metrics: z.array(evaluationMetricResultSchema),
  status: evaluationMetricStatusSchema,
  humanReviewRequired: z.boolean(),
  createdAt: z.string().min(1),
});

export type EvaluationResult = z.infer<typeof evaluationResultSchema>;
export type EvaluationMetricResult = z.infer<
  typeof evaluationMetricResultSchema
>;
