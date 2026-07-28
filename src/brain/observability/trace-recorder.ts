import { randomUUID } from "node:crypto";

import {
  CONTENT_RUN_TRACE_SCHEMA_VERSION,
  contentRunTraceSchema,
  type ContentRunTrace,
  type ContentRunTraceStage,
} from "@/brain/contracts";

export type RunContext = {
  runId: string;
  workflowVersion: string;
  brandCoreId?: string;
  brandCoreHash?: string;
  inputSummary?: string;
  trace: TraceRecorder;
};

type StageOpen = {
  stage: string;
  startedAt: string;
  startedMs: number;
  provider?: string;
  model?: string;
  promptId?: string;
  promptVersion?: string;
};

export class TraceRecorder {
  private readonly stages: ContentRunTraceStage[] = [];
  private readonly open = new Map<string, StageOpen>();
  private validationStatus: ContentRunTrace["validationStatus"];
  private evaluationStatus: ContentRunTrace["evaluationStatus"];
  private humanDecisionType?: string;

  stageStarted(
    stage: string,
    meta?: Omit<StageOpen, "stage" | "startedAt" | "startedMs">
  ): void {
    this.open.set(stage, {
      stage,
      startedAt: new Date().toISOString(),
      startedMs: Date.now(),
      ...meta,
    });
  }

  modelCalled(stage: string, provider: string, model?: string): void {
    const cur = this.open.get(stage);
    if (cur) {
      cur.provider = provider;
      cur.model = model;
    }
  }

  validationFailed(stage: string, summary: string): void {
    this.validationStatus = "fail";
    this.stageCompleted(stage, "error", { summary, errorClass: "validation" });
  }

  stageCompleted(
    stage: string,
    status: ContentRunTraceStage["status"],
    extra?: Partial<ContentRunTraceStage>
  ): void {
    const open = this.open.get(stage);
    const finishedAt = new Date().toISOString();
    const latencyMs = open ? Date.now() - open.startedMs : undefined;
    this.stages.push({
      stage,
      status,
      startedAt: open?.startedAt,
      finishedAt,
      latencyMs,
      provider: open?.provider ?? extra?.provider,
      model: open?.model ?? extra?.model,
      promptId: open?.promptId ?? extra?.promptId,
      promptVersion: open?.promptVersion ?? extra?.promptVersion,
      retryCount: extra?.retryCount ?? 0,
      tokenUsage: extra?.tokenUsage,
      estimatedCostUsd: extra?.estimatedCostUsd ?? null,
      errorClass: extra?.errorClass,
      summary: extra?.summary,
    });
    this.open.delete(stage);
  }

  setValidationStatus(status: ContentRunTrace["validationStatus"]): void {
    this.validationStatus = status;
  }

  setEvaluationStatus(status: ContentRunTrace["evaluationStatus"]): void {
    this.evaluationStatus = status;
  }

  setHumanDecision(decisionType: string): void {
    this.humanDecisionType = decisionType;
  }

  build(finalStatus: ContentRunTrace["finalStatus"], ctx: Omit<RunContext, "trace">): ContentRunTrace {
    return contentRunTraceSchema.parse({
      schemaVersion: CONTENT_RUN_TRACE_SCHEMA_VERSION,
      runId: ctx.runId,
      workflowVersion: ctx.workflowVersion,
      brandCoreId: ctx.brandCoreId,
      brandCoreHash: ctx.brandCoreHash,
      inputSummary: redactSecrets(ctx.inputSummary),
      stages: this.stages.map((s) => ({
        ...s,
        summary: s.summary ? redactSecrets(s.summary) : s.summary,
      })),
      validationStatus: this.validationStatus,
      evaluationStatus: this.evaluationStatus,
      humanDecisionType: this.humanDecisionType,
      finalStatus,
      createdAt: this.stages[0]?.startedAt ?? new Date().toISOString(),
      finishedAt: new Date().toISOString(),
    });
  }
}

export function createRunContext(input: {
  workflowVersion: string;
  brandCoreId?: string;
  brandCoreHash?: string;
  inputSummary?: string;
  runId?: string;
}): RunContext {
  return {
    runId: input.runId ?? `run_${randomUUID()}`,
    workflowVersion: input.workflowVersion,
    brandCoreId: input.brandCoreId,
    brandCoreHash: input.brandCoreHash,
    inputSummary: input.inputSummary,
    trace: new TraceRecorder(),
  };
}

/** Strip obvious secret patterns from trace text. */
export function redactSecrets(text: string | undefined): string | undefined {
  if (!text) return text;
  return text
    .replace(/sk-[a-zA-Z0-9_-]{10,}/g, "[REDACTED_API_KEY]")
    .replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, "Bearer [REDACTED]")
    .replace(/(api[_-]?key|secret|token)\s*[:=]\s*\S+/gi, "$1=[REDACTED]");
}
