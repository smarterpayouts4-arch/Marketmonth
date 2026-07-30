"use client";

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
          selectHint="Select one to continue to Content Atom review"
          onHighlight={onHighlight}
          onConfirm={onConfirm}
          disabled={loading}
        />
      ) : null}
    </>
  );
}
