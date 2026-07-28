"use client";

import { Brain } from "lucide-react";

import type { BrandProfile } from "@/data/mock-brand";
import { ColorSwatch } from "@/components/shared/color-swatch";
import { Button } from "@/components/ui/button";
import { PrimaryButton } from "@/components/ui/primary-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

type BrandSummaryPanelProps = {
  brand: BrandProfile;
  onApprove: () => void;
  onSave: () => void;
  className?: string;
};

export function BrandSummaryPanel({
  brand,
  onApprove,
  onSave,
  className,
}: BrandSummaryPanelProps) {
  return (
    <aside
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-soft lg:sticky lg:top-6",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-subtle text-primary">
          <Brain className="size-5" aria-hidden />
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
            Your Brand Brain
          </p>
          <p className="text-sm font-semibold">{brand.companyName}</p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">Completion</span>
          <span className="text-sm font-semibold">
            {brand.reviewedAreas} of {brand.totalAreas} areas reviewed
          </span>
        </div>
        <StatusBadge tone="success">Ready for Strategy</StatusBadge>
        <p className="text-sm text-text-secondary">
          We&apos;ll use this profile whenever we generate topics, scripts,
          visuals, captions and campaigns.
        </p>
      </div>

      <div className="mt-5 space-y-2">
        <p className="text-xs font-medium text-text-muted uppercase">Voice</p>
        <div className="flex flex-wrap gap-1.5">
          {brand.voiceTraits.slice(0, 4).map((trait) => (
            <span
              key={trait}
              className="rounded-full bg-subtle px-2.5 py-1 text-xs font-medium text-primary-dark"
            >
              {trait}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-4 gap-2">
        {brand.colors.map((color) => (
          <ColorSwatch key={color.hex} hex={color.hex} large />
        ))}
      </div>

      <div className="mt-6 space-y-2">
        <PrimaryButton className="w-full" onClick={onApprove}>
          Approve Brand Profile
        </PrimaryButton>
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full rounded-xl"
          onClick={onSave}
        >
          Save for Later
        </Button>
      </div>
    </aside>
  );
}
