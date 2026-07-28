"use client";

import type { ProductionPackage } from "./types";
import { cn } from "@/lib/utils";

type GeneratedAssetThumbnailProps = {
  asset: ProductionPackage["alternateAssets"][number];
  index: number;
  selected: boolean;
  onSelect: () => void;
};

export function GeneratedAssetThumbnail({
  asset,
  index,
  selected,
  onSelect,
}: GeneratedAssetThumbnailProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Variation ${index + 1}: ${asset.label}${selected ? ", selected" : ""}`}
      className={cn(
        "flex h-[60px] w-[76px] shrink-0 flex-col overflow-hidden rounded-md border text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
        selected
          ? "border-primary ring-1 ring-primary/40"
          : "border-border hover:border-primary/40"
      )}
    >
      <div
        className={cn(
          "flex min-h-0 flex-1 items-end p-1.5 text-[9px] font-medium leading-tight text-foreground",
          index % 2 === 0
            ? "bg-gradient-to-br from-emerald-50 to-warm"
            : "bg-gradient-to-br from-sky-50 to-warm"
        )}
      >
        <span className="line-clamp-2">{asset.label}</span>
      </div>
      <span className="truncate border-t border-border/60 px-1.5 py-0.5 text-[10px] text-text-muted">
        {index + 1}
      </span>
    </button>
  );
}
