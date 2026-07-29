import type { IdeaLabCandidatesResult } from "@/brain/evaluation/topic-candidate-types";

import { resolveEvidenceClaims } from "./resolve-evidence";
import { Row } from "./row";

export function CandidatesTab({
  result,
}: {
  result: IdeaLabCandidatesResult | null;
}) {
  if (!result) {
    return (
      <p className="text-sm text-text-muted" data-testid="inspector-candidates-empty">
        Run Auto-generate to inspect candidate scores and subject provenance.
      </p>
    );
  }

  const gen = result.generation;

  return (
    <div className="space-y-4" data-testid="inspector-candidates">
      <dl className="space-y-2">
        <Row label="Status" value={gen.status} />
        <Row
          label="Completeness"
          value={gen.status === "success" ? gen.completeness : "—"}
        />
        <Row label="Score version" value={result.scoreVersion} />
        <Row
          label="History written"
          value={result.historyWritten ? "Yes" : "No (expected)"}
        />
        <Row label="Candidate count" value={String(result.candidates.length)} />
      </dl>
      {gen.status === "insufficient_context" ? (
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
          <p className="font-semibold">{gen.diagnostic.code}</p>
          <p className="mt-1 text-text-secondary">{gen.diagnostic.message}</p>
        </div>
      ) : null}
      {gen.status === "success" && gen.warnings.length > 0 ? (
        <ul className="space-y-1 text-xs text-text-secondary">
          {gen.warnings.map((w) => (
            <li key={w.code}>
              <span className="font-medium">{w.code}:</span> {w.message}
            </li>
          ))}
        </ul>
      ) : null}
      <ol className="space-y-3">
        {result.candidates.map((c) => {
          const claims = resolveEvidenceClaims(
            c.evidenceIds,
            result.evidenceClaimsById
          );
          return (
            <li
              key={c.topicId}
              className="rounded-lg border border-border px-3 py-2"
              data-testid={`inspector-candidate-${c.rank}`}
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
              <p className="mt-1 text-[11px] text-text-muted">
                subject={c.subject?.label ?? c.title} · kind=
                {c.subject?.kind ?? c.subjectKind} · provenance=
                {c.subject?.sourceType ?? "brand_observed"} · confidence=
                {c.subject?.classificationConfidence ??
                  c.classificationConfidence}{" "}
                · sources={c.sourceFields.join(", ")}
                {c.titleItchType
                  ? ` · titleHook=${c.titleHookVersion ?? "topic-title-hook-v2"} · itch=${c.titleItchType}`
                  : ""}
                {c.titleSource ? ` · titleSource=${c.titleSource}` : ""}
              </p>
              <p className="mt-0.5 text-[11px] text-text-secondary">
                {c.classificationReason}
              </p>
              {claims.length > 0 ? (
                <ul className="mt-1 space-y-1 text-[11px] text-text-muted">
                  {claims.map((claim) => (
                    <li key={claim.id}>
                      <span className="font-mono text-[10px]">{claim.id}</span>
                      {claim.field ? ` · ${claim.field}` : ""}: {claim.claim}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-0.5 text-[11px] text-text-muted">
                  evidence: (none)
                </p>
              )}
              <pre className="mt-2 overflow-x-auto rounded bg-muted/50 p-2 text-[10px] leading-relaxed text-text-secondary">
                {JSON.stringify(
                  {
                    scoreVersion: c.scoreVersion,
                    ...c.score,
                  },
                  null,
                  2
                )}
              </pre>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
