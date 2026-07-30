"use client";

import type {
  TopicCandidate,
  TopicGenerationDiagnostic,
  TopicGenerationWarning,
} from "@/brain/evaluation/topic-candidate-types";

import { TopicCandidateList } from "./topic-candidate-list";

export type TopicCandidatesPanelProps = {
  loading: boolean;
  pendingMode: "automatic" | "manual" | null;
  hasCandidates: boolean;
  hasDirections: boolean;
  hasInsufficient: boolean;
  candidates: TopicCandidate[] | null;
  candidateCompleteness: "complete" | "limited" | null;
  candidateWarnings: TopicGenerationWarning[];
  candidateDiagnostic: TopicGenerationDiagnostic | null;
  selectedCandidateId: string | null;
  onSelectCandidate: (candidate: TopicCandidate) => void;
  /** Optional testid prefix (default: topic-candidates). */
  testIdPrefix?: string;
  emptyHint?: string;
};

export function TopicCandidatesPanel({
  loading,
  pendingMode,
  hasCandidates,
  hasDirections,
  hasInsufficient,
  candidates,
  candidateCompleteness,
  candidateWarnings,
  candidateDiagnostic,
  selectedCandidateId,
  onSelectCandidate,
  testIdPrefix = "topic-candidates",
  emptyHint = "Select a topic category, then Auto-generate to see ranked topic candidates.",
}: TopicCandidatesPanelProps) {
  return (
    <>
      {loading && pendingMode === "automatic" ? (
        <p
          className="mt-4 text-sm text-text-secondary"
          data-testid={`${testIdPrefix}-loading`}
        >
          Ranking topic candidates…
        </p>
      ) : null}

      {!loading && hasInsufficient ? (
        <div
          className="mt-4 rounded-xl border border-border bg-muted/30 px-4 py-4"
          data-testid={`${testIdPrefix}-insufficient`}
          role="status"
        >
          <p className="text-sm font-medium text-foreground">
            Not enough product subjects for this topic category
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            {candidateDiagnostic?.message}
          </p>
          <p className="mt-2 text-xs text-text-muted">
            This is an honest context gap — not a system failure. Enrich catalog
            or product research, then try again.
          </p>
        </div>
      ) : null}

      {!loading && hasCandidates && !hasDirections ? (
        <>
          <TopicCandidateList
            candidates={candidates!}
            completeness={candidateCompleteness ?? "limited"}
            warnings={candidateWarnings}
            selectedTopicId={selectedCandidateId}
            onSelect={onSelectCandidate}
            disabled={loading}
            testIdPrefix={testIdPrefix}
          />
          <p
            className="mt-3 max-w-2xl text-[11px] leading-relaxed text-text-muted"
            data-testid={`${testIdPrefix}-disclaimer`}
          >
            Marketing and educational content only. MarketMonth does not provide
            medical advice or product recommendations. Viewers should
            independently verify product information.
          </p>
        </>
      ) : null}

      {!loading &&
      !hasDirections &&
      !hasCandidates &&
      !hasInsufficient &&
      emptyHint ? (
        <p
          className="mt-6 rounded-xl border border-dashed border-border bg-card/50 px-4 py-6 text-center text-sm text-text-secondary"
          data-testid={`${testIdPrefix}-empty`}
        >
          {emptyHint}
        </p>
      ) : null}
    </>
  );
}
