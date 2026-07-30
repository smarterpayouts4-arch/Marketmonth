"use client";

import { Star } from "lucide-react";

import type {
  TopicCandidate,
  TopicGenerationWarning,
} from "@/brain/evaluation/topic-candidate-types";
import { cn } from "@/lib/utils";

import { IdeaLabTitleHookBadge } from "./idea-lab-title-hook-badge";

type IdeaLabCandidateListProps = {
  candidates: TopicCandidate[];
  completeness: "complete" | "limited";
  warnings?: TopicGenerationWarning[];
  selectedTopicId: string | null;
  onSelect: (candidate: TopicCandidate) => void;
  disabled?: boolean;
};

/**
 * Idea Lab candidate list — presentational, Lab testids + title-hook badge.
 * Product Marketing Topic uses the shared TopicCandidateList instead.
 */
export function IdeaLabCandidateList({
  candidates,
  completeness,
  warnings = [],
  selectedTopicId,
  onSelect,
  disabled,
}: IdeaLabCandidateListProps) {
  const count = candidates.length;
  const subtitle =
    completeness === "complete"
      ? "Six system-ranked topics. Select one to generate six content directions."
      : `We found ${count} evidence-grounded topic${count === 1 ? "" : "s"}. Add product or catalog research to generate more.`;

  return (
    <section
      className="mt-4"
      data-testid="idea-lab-candidates"
      data-completeness={completeness}
      aria-label="Ranked topic candidates"
    >
      <h2 className="text-sm font-semibold text-foreground">
        Ranked topic candidates
      </h2>
      <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>
      {warnings.length > 0 ? (
        <ul
          className="mt-2 space-y-1 rounded-lg border border-border bg-muted/40 px-3 py-2"
          data-testid="idea-lab-candidate-warnings"
        >
          {warnings.map((w) => (
            <li key={w.code} className="text-xs text-text-secondary">
              {w.message}
            </li>
          ))}
        </ul>
      ) : null}
      <ol className="mt-3 space-y-2">
        {candidates.map((c) => {
          const selected = selectedTopicId === c.topicId;
          return (
            <li key={c.topicId}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelect(c)}
                data-testid={`idea-lab-candidate-${c.rank}`}
                className={cn(
                  "w-full rounded-xl border px-3 py-2.5 text-left transition",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  selected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/40",
                  disabled && "cursor-not-allowed opacity-60"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold text-text-muted">
                        #{c.rank}
                      </span>
                      {c.recommended ? (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                          <Star className="size-2.5" aria-hidden />
                          Recommended
                        </span>
                      ) : null}
                      <span className="text-[10px] text-text-muted">
                        {c.subjectKind}
                      </span>
                      <span
                        className="text-[10px] text-text-muted"
                        data-testid={`idea-lab-candidate-provenance-${c.rank}`}
                      >
                        {c.subject?.sourceType === "industry_research"
                          ? "industry_research"
                          : "brand_observed"}
                      </span>
                      <IdeaLabTitleHookBadge
                        rank={c.rank}
                        titleItchType={c.titleItchType}
                        titleHookVersion={c.titleHookVersion}
                      />
                    </div>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {c.title}
                    </p>
                    {c.whyItFits ? (
                      <p className="mt-0.5 text-xs text-text-secondary">
                        {c.whyItFits}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs text-text-secondary">
                        {c.strategicAngle}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-[11px] font-semibold tabular-nums text-text-muted">
                    {c.score.overall.toFixed(2)}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
