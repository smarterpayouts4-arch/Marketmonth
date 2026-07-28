import { z } from "zod";

export const CONTENT_RUN_TRACE_SCHEMA_VERSION = "content-run-trace-v1" as const;

export const contentRunTraceStageSchema = z.object({
  stage: z.string().min(1),
  status: z.enum(["success", "error", "skipped", "warning"]),
  startedAt: z.string().optional(),
  finishedAt: z.string().optional(),
  latencyMs: z.number().nonnegative().optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  promptId: z.string().optional(),
  promptVersion: z.string().optional(),
  retryCount: z.number().int().nonnegative().optional(),
  tokenUsage: z
    .object({
      promptTokens: z.number().optional(),
      completionTokens: z.number().optional(),
      totalTokens: z.number().optional(),
    })
    .optional(),
  estimatedCostUsd: z.number().nonnegative().nullable().optional(),
  errorClass: z.string().optional(),
  summary: z.string().optional(),
});

export const contentRunTraceSchema = z.object({
  schemaVersion: z.literal(CONTENT_RUN_TRACE_SCHEMA_VERSION),
  runId: z.string().min(1),
  workflowVersion: z.string().min(1),
  brandCoreId: z.string().optional(),
  brandCoreHash: z.string().optional(),
  inputSummary: z.string().optional(),
  stages: z.array(contentRunTraceStageSchema),
  validationStatus: z.enum(["pass", "fail", "skipped"]).optional(),
  evaluationStatus: z.enum(["PASS", "FAIL", "WARNING", "skipped"]).optional(),
  humanDecisionType: z.string().optional(),
  finalStatus: z.enum(["success", "error", "blocked", "needs_review"]),
  createdAt: z.string().min(1),
  finishedAt: z.string().optional(),
});

export type ContentRunTrace = z.infer<typeof contentRunTraceSchema>;
export type ContentRunTraceStage = z.infer<typeof contentRunTraceStageSchema>;
