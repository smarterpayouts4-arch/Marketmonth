"use client";

import type { ProductionPackage } from "./types";

import { GeneratedAssetThumbnail } from "./generated-asset-thumbnail";

type AlternateRendersProps = {
  assets: ProductionPackage["alternateAssets"];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function AlternateRenders({
  assets,
  selectedId,
  onSelect,
}: AlternateRendersProps) {
  if (assets.length === 0) return null;

  const visible = assets.slice(0, 6);

  return (
    <section aria-label="Alternate renders" className="min-w-0 flex-1 shrink-0">
      <p className="mb-0.5 text-[11px] font-medium text-text-secondary">
        Alternate renders ({assets.length})
      </p>
      <ul className="flex gap-1 overflow-x-auto pb-0.5">
        {visible.map((asset, index) => (
          <li key={asset.id} className="shrink-0">
            <GeneratedAssetThumbnail
              asset={asset}
              index={index}
              selected={asset.id === selectedId}
              onSelect={() => onSelect(asset.id)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
