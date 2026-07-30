"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

import { ContentVariationCard } from "./content-variation-card";
import type { ContentVariation } from "./types";

type ContentVariationGridProps = {
  variations: ContentVariation[];
  selectedVariationId: string | null;
  /** Arrow-key highlight only (no navigation). */
  onHighlight: (id: string) => void;
  /** Click / Enter / Space — commit selection and continue. */
  onConfirm: (id: string) => void;
  disabled?: boolean;
  /** Override helper under the section title (product default preserved). */
  selectHint?: string;
  /** Optional badge/meta rendered under each card (e.g. Idea Lab scores). */
  renderCardMeta?: (variation: ContentVariation) => ReactNode;
};

export function ContentVariationGrid({
  variations,
  selectedVariationId,
  onHighlight,
  onConfirm,
  disabled,
  selectHint = "Select one to continue to Content Atom review",
  renderCardMeta,
}: ContentVariationGridProps) {
  const groupRef = useRef<HTMLDivElement>(null);

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (disabled || variations.length === 0) return;

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const id =
        selectedVariationId ??
        variations[0]?.id ??
        null;
      if (id) onConfirm(id);
      return;
    }

    const keys = [
      "ArrowRight",
      "ArrowLeft",
      "ArrowDown",
      "ArrowUp",
      "Home",
      "End",
    ];
    if (!keys.includes(e.key)) return;

    e.preventDefault();
    const ids = variations.map((v) => v.id);
    const currentIndex = selectedVariationId
      ? ids.indexOf(selectedVariationId)
      : 0;
    let next = currentIndex < 0 ? 0 : currentIndex;

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      next = (currentIndex + 1) % ids.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      next = (currentIndex - 1 + ids.length) % ids.length;
    } else if (e.key === "Home") {
      next = 0;
    } else if (e.key === "End") {
      next = ids.length - 1;
    }

    onHighlight(ids[next]);
    const buttons = groupRef.current?.querySelectorAll<HTMLButtonElement>(
      '[role="radio"]'
    );
    buttons?.[next]?.focus();
  }

  return (
    <section className="mt-3" aria-labelledby="directions-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p
          id="directions-heading"
          className="text-[11px] font-semibold tracking-[0.14em] text-text-muted uppercase"
        >
          Six content directions
        </p>
        <p className="text-xs text-text-muted">{selectHint}</p>
      </div>

      <div
        ref={groupRef}
        role="radiogroup"
        aria-labelledby="directions-heading"
        onKeyDown={handleKeyDown}
        className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {variations.map((variation) => (
          <div key={variation.id} className="flex h-full flex-col gap-1.5">
            <ContentVariationCard
              variation={variation}
              selected={variation.id === selectedVariationId}
              disabled={disabled}
              onSelect={onConfirm}
            />
            {renderCardMeta?.(variation)}
          </div>
        ))}
      </div>
    </section>
  );
}
