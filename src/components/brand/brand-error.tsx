"use client";

import { Button } from "@/components/ui/button";
import { PrimaryButton } from "@/components/ui/primary-button";

type BrandErrorProps = {
  onTryAgain: () => void;
  onManual: () => void;
};

export function BrandError({ onTryAgain, onManual }: BrandErrorProps) {
  return (
    <section className="rounded-2xl border border-danger/20 bg-card p-6 shadow-soft sm:p-8">
      <p className="text-xs font-semibold tracking-[0.14em] text-danger uppercase">
        Something went wrong
      </p>
      <h2 className="mt-2 text-section">We couldn&apos;t read that website.</h2>
      <p className="mt-2 text-sm text-text-secondary">
        Check the URL or add your brand manually.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <PrimaryButton onClick={onTryAgain}>Try Again</PrimaryButton>
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-xl"
          onClick={onManual}
        >
          Enter Brand Manually
        </Button>
      </div>
    </section>
  );
}
