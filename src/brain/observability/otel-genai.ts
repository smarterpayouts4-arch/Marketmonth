import type { ContentRunTrace } from "@/brain/contracts";

/**
 * OpenTelemetry GenAI semantic-convention alignment (P3.1).
 *
 * Maps a ContentRunTrace onto gen_ai.* attribute sets (one per model-calling
 * stage) so an exporter can emit spans without renaming anything. No OTel
 * SDK dependency — this is the attribute contract, kept in sync with
 * https://opentelemetry.io/docs/specs/semconv/gen-ai/ naming.
 */

export type OtelGenAiSpan = {
  spanName: string;
  attributes: Record<string, string | number>;
};

export function toOtelGenAiAttributes(trace: ContentRunTrace): OtelGenAiSpan[] {
  const spans: OtelGenAiSpan[] = [];

  for (const stage of trace.stages) {
    if (!stage.provider && !stage.model) continue;

    const attributes: Record<string, string | number> = {
      "gen_ai.operation.name": "chat",
      "marketmonth.run_id": trace.runId,
      "marketmonth.workflow_version": trace.workflowVersion,
      "marketmonth.stage": stage.stage,
      "marketmonth.stage_status": stage.status,
    };
    if (stage.provider) attributes["gen_ai.system"] = stage.provider;
    if (stage.model) attributes["gen_ai.request.model"] = stage.model;
    if (stage.promptId) attributes["marketmonth.prompt_id"] = stage.promptId;
    if (stage.promptVersion) {
      attributes["marketmonth.prompt_version"] = stage.promptVersion;
    }
    if (stage.tokenUsage?.promptTokens !== undefined) {
      attributes["gen_ai.usage.input_tokens"] = stage.tokenUsage.promptTokens;
    }
    if (stage.tokenUsage?.completionTokens !== undefined) {
      attributes["gen_ai.usage.output_tokens"] =
        stage.tokenUsage.completionTokens;
    }
    if (stage.latencyMs !== undefined) {
      attributes["marketmonth.latency_ms"] = stage.latencyMs;
    }
    if (stage.retryCount !== undefined) {
      attributes["marketmonth.retry_count"] = stage.retryCount;
    }
    if (stage.errorClass) {
      attributes["error.type"] = stage.errorClass;
    }

    spans.push({
      spanName: `${stage.provider ?? "llm"} ${stage.stage}`,
      attributes,
    });
  }

  return spans;
}
