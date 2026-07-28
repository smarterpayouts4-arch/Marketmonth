"use client";

import {
  averageScores,
  type IdeaHumanEvaluation,
} from "@/brain/evaluation/idea-quality.schema";
import { ContentVariationGrid } from "@/components/dashboard/marketing-topic/content-variation-grid";
import { VariationGridLoading } from "@/components/dashboard/marketing-topic/variation-grid-loading";
import type { ContentVariation } from "@/brain/content/types";

type Props = {
  loading: boolean;
  pendingMode: "automatic" | "manual" | null;
  hasDirections: boolean;
  brandName: string;
  variations: ContentVariation[];
  selectedIdeaId: string | null;
  evals: Record<string, IdeaHumanEvaluation>;
  onHighlight: (id: string) => void;
  onConfirm: (id: string) => void;
};

export function IdeaLabDirectionsPanel({
  loading,
  pendingMode,
  hasDirections,
  brandName,
  variations,
  selectedIdeaId,
  evals,
  onHighlight,
  onConfirm,
}: Props) {
  return (
    <>
      {loading && pendingMode === "manual" ? (
        <VariationGridLoading
          mode="manual"
          brandName={brandName}
          regenerating={false}
        />
      ) : null}

      {hasDirections ? (
        <ContentVariationGrid
          variations={variations}
          selectedVariationId={selectedIdeaId}
          selectHint="Select an idea to evaluate"
          onHighlight={onHighlight}
          onConfirm={onConfirm}
          disabled={loading}
          renderCardMeta={(variation) => {
            const ev = evals[variation.id];
            if (!ev) return null;
            return (
              <div className="flex items-center gap-2 px-0.5 text-[11px] text-text-muted">
                <span className="rounded-md bg-muted px-1.5 py-0.5 font-semibold text-foreground">
                  {averageScores(ev.scores).toFixed(1)}
                </span>
                <span className="capitalize">{ev.disposition}</span>
              </div>
            );
          }}
        />
      ) : null}
    </>
  );
}
