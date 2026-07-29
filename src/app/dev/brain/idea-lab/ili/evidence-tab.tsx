import {
  TOPIC_CATEGORY_LABELS,
  type TopicCategoryId,
} from "@/brain/content/topic-category";
import type { IdeaLabCandidatesResult } from "@/brain/evaluation/topic-candidate-types";

import { resolveEvidenceClaims } from "./resolve-evidence";
import { Row } from "./row";

function formatTokenUsage(
  usage?: IdeaLabCandidatesResult["llmTokenUsage"]
): string {
  if (!usage) return "—";
  const parts: string[] = [];
  if (usage.promptTokens != null) parts.push(`prompt=${usage.promptTokens}`);
  if (usage.completionTokens != null) {
    parts.push(`completion=${usage.completionTokens}`);
  }
  if (usage.totalTokens != null) parts.push(`total=${usage.totalTokens}`);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

export function EvidenceTab({
  result,
}: {
  result: IdeaLabCandidatesResult | null;
}) {
  if (!result) {
    return (
      <p className="text-sm text-text-muted" data-testid="inspector-evidence-empty">
        Run Auto-generate to inspect evidence selection and candidate grounding.
      </p>
    );
  }

  const trace = result.generationTrace;
  const categoryLabel =
    TOPIC_CATEGORY_LABELS[result.objective as TopicCategoryId] ??
    result.objective;

  return (
    <div className="space-y-4" data-testid="inspector-evidence">
      <dl className="space-y-2">
        <Row label="Topic category" value={categoryLabel} />
        <Row
          label="Evidence indexed"
          value={String(trace?.evidenceIndexCount ?? "—")}
        />
        <Row
          label="Evidence selected"
          value={String(trace?.evidenceSelectedCount ?? "—")}
        />
        <Row
          label="LLM used"
          value={
            trace?.llmUsed == null ? "—" : trace.llmUsed ? "Yes" : "No"
          }
        />
        <Row
          label="Deterministic fallback"
          value={
            trace?.deterministicFallbackUsed == null
              ? "—"
              : trace.deterministicFallbackUsed
                ? "Yes"
                : "No"
          }
        />
        <Row label="Token usage" value={formatTokenUsage(result.llmTokenUsage)} />
      </dl>

      {result.llmFailureReason ? (
        <div
          className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs"
          data-testid="inspector-evidence-llm-failure"
        >
          <p className="font-semibold text-foreground">
            LLM failure: {result.llmFailureReason}
          </p>
          {result.llmFailureDetail ? (
            <p className="mt-1 text-text-secondary">{result.llmFailureDetail}</p>
          ) : null}
        </div>
      ) : null}

      {result.candidateTrace?.length ? (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Pipeline trace
          </h3>
          <ol className="mt-2 space-y-2">
            {result.candidateTrace.map((step) => (
              <li
                key={step.step}
                className="rounded-lg border border-border px-3 py-2 text-xs"
              >
                <p className="font-medium text-foreground">
                  {step.step}. {step.stage}{" "}
                  <span className="font-normal text-text-muted">
                    ({step.status})
                  </span>
                </p>
                {step.outputSummary ? (
                  <pre className="mt-1 overflow-x-auto whitespace-pre-wrap font-mono text-[10px] text-text-muted">
                    {JSON.stringify(step.outputSummary, null, 2)}
                  </pre>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Candidates → evidence
        </h3>
        <ol className="mt-2 space-y-3">
          {result.candidates.map((c) => {
            const ids = c.evidenceRefs?.length
              ? c.evidenceRefs
              : c.evidenceIds;
            const claims = resolveEvidenceClaims(
              ids,
              result.evidenceClaimsById
            );
            return (
              <li
                key={c.topicId}
                className="rounded-lg border border-border px-3 py-2"
                data-testid={`inspector-evidence-candidate-${c.rank}`}
              >
                <p className="text-xs font-semibold text-foreground">
                  #{c.rank} · {c.title}
                </p>
                {c.whyItFits ? (
                  <p className="mt-1 text-[11px] text-text-secondary">
                    whyItFits: {c.whyItFits}
                  </p>
                ) : null}
                {c.hook ? (
                  <p className="mt-0.5 text-[11px] text-text-muted">
                    hook: {c.hook}
                  </p>
                ) : null}
                {claims.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-[11px] text-text-secondary">
                    {claims.map((claim) => (
                      <li key={claim.id}>
                        <span className="font-mono text-[10px] text-text-muted">
                          {claim.id}
                        </span>
                        {claim.field ? (
                          <span className="text-text-muted"> · {claim.field}</span>
                        ) : null}
                        <p className="mt-0.5">{claim.claim}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-[11px] text-text-muted">(no evidence)</p>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
