"use client";

import { X } from "lucide-react";

import {
  IDEA_QUALITY_DIMENSIONS,
  averageScores,
  type IdeaHumanEvaluation,
  type IdeaQualityScores,
  type PrimaryWeakness,
} from "@/brain/evaluation/idea-quality.schema";

const EMPTY_SCORES: IdeaQualityScores = {
  csv_relevance: 3,
  brand_alignment: 3,
  audience_relevance: 3,
  specificity: 3,
  originality: 3,
  usefulness: 3,
  distinctness: 3,
  evidence_grounding: 3,
  clarity: 3,
  would_create: 3,
};

const WEAKNESSES: { value: PrimaryWeakness; label: string }[] = [
  { value: "too_generic", label: "Too generic" },
  { value: "not_relevant_to_csv", label: "Not relevant to CSV" },
  { value: "repetitive", label: "Repetitive" },
  { value: "weak_hook", label: "Weak hook" },
  { value: "weak_audience_fit", label: "Weak audience fit" },
  { value: "unsupported_claim", label: "Unsupported claim" },
  { value: "too_promotional", label: "Too promotional" },
  { value: "not_actionable", label: "Not actionable" },
  { value: "already_overused", label: "Already overused" },
  { value: "other", label: "Other" },
];

const DIM_LABELS: Record<(typeof IDEA_QUALITY_DIMENSIONS)[number], string> = {
  csv_relevance: "CSV relevance",
  brand_alignment: "Brand alignment",
  audience_relevance: "Audience relevance",
  specificity: "Specificity",
  originality: "Originality",
  usefulness: "Usefulness",
  distinctness: "Distinctness",
  evidence_grounding: "Evidence grounding",
  clarity: "Clarity",
  would_create: "Would I actually create this?",
};

type Props = {
  open: boolean;
  title: string;
  value?: IdeaHumanEvaluation;
  ideaId: string;
  onClose: () => void;
  onChange: (v: IdeaHumanEvaluation) => void;
  onSave: () => void;
  saving?: boolean;
};

export function IdeaLabEvaluationDrawer({
  open,
  title,
  value,
  ideaId,
  onClose,
  onChange,
  onSave,
  saving,
}: Props) {
  if (!open) return null;

  const scores = value?.scores ?? EMPTY_SCORES;
  const disposition = value?.disposition ?? "maybe";
  const weakness = value?.primaryWeakness ?? "too_generic";
  const notes = value?.notes ?? "";

  const emit = (patch: Partial<IdeaHumanEvaluation>) => {
    onChange({
      ideaId,
      scores: patch.scores ?? scores,
      disposition: patch.disposition ?? disposition,
      primaryWeakness: patch.primaryWeakness ?? weakness,
      notes: patch.notes ?? notes,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex justify-end bg-black/30"
      role="dialog"
      aria-modal="true"
      aria-labelledby="idea-lab-eval-title"
    >
      <button
        type="button"
        className="h-full flex-1 cursor-default"
        aria-label="Close evaluation panel"
        onClick={onClose}
      />
      <aside className="flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-soft">
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-text-muted uppercase">
              Evaluate idea
            </p>
            <h2
              id="idea-lab-eval-title"
              className="mt-1 text-base font-semibold leading-snug text-foreground"
            >
              {title}
            </h2>
            <p className="mt-1 text-xs text-text-muted">
              Lab evaluation only — does not create a Content Atom.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-muted hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm">
          <div>
            <p className="mb-2 text-xs font-medium text-text-muted">
              Disposition
            </p>
            <div className="flex flex-wrap gap-2">
              {(["keep", "maybe", "reject"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => emit({ disposition: d })}
                  className={
                    disposition === d
                      ? "rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                      : "rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground"
                  }
                >
                  {d === "keep" ? "Keep" : d === "maybe" ? "Maybe" : "Reject"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-text-muted">
                Quality (1–5)
              </p>
              <p className="text-xs font-semibold text-foreground">
                Avg {averageScores(scores).toFixed(1)}
              </p>
            </div>
            <div className="space-y-2">
              {IDEA_QUALITY_DIMENSIONS.map((dim) => (
                <label
                  key={dim}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="text-xs text-text-secondary">
                    {DIM_LABELS[dim]}
                  </span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        aria-label={`${DIM_LABELS[dim]} ${n}`}
                        onClick={() =>
                          emit({ scores: { ...scores, [dim]: n } })
                        }
                        className={
                          scores[dim] === n
                            ? "size-7 rounded-md bg-primary text-xs font-semibold text-primary-foreground"
                            : "size-7 rounded-md border border-border text-xs text-text-muted hover:border-primary/40"
                        }
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-text-muted">
              Main weakness
            </span>
            <select
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              value={weakness}
              onChange={(e) =>
                emit({ primaryWeakness: e.target.value as PrimaryWeakness })
              }
            >
              {WEAKNESSES.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-text-muted">Notes</span>
            <textarea
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              rows={3}
              value={notes}
              onChange={(e) => emit({ notes: e.target.value })}
            />
          </label>
        </div>

        <div className="border-t border-border px-4 py-3">
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="w-full rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save evaluation"}
          </button>
        </div>
      </aside>
    </div>
  );
}
