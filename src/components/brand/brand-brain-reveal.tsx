"use client";

import { useEffect, useState } from "react";
import { Brain } from "lucide-react";

import type { BrandProfile } from "@/data/mock-brand";
import { PrimaryButton } from "@/components/ui/primary-button";
import { cn } from "@/lib/utils";

const orbitItems = [
  { key: "products", label: "Products", position: "left-4 top-8 sm:left-10" },
  { key: "audience", label: "Audience", position: "right-4 top-10 sm:right-12" },
  { key: "voice", label: "Voice", position: "left-2 bottom-16 sm:left-16" },
  { key: "colors", label: "Colors", position: "right-2 bottom-14 sm:right-16" },
  { key: "faqs", label: "FAQs", position: "top-2 left-1/2 -translate-x-1/2" },
  {
    key: "value",
    label: "Value Prop",
    position: "bottom-2 left-1/2 -translate-x-1/2",
  },
] as const;

type BrandBrainRevealProps = {
  brand: BrandProfile;
  onContinue: () => void;
};

export function BrandBrainReveal({ brand, onContinue }: BrandBrainRevealProps) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    const timers: number[] = [];
    orbitItems.forEach((_, index) => {
      timers.push(
        window.setTimeout(() => {
          setVisibleCount(index + 1);
        }, 220 + index * 180)
      );
    });
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card px-4 py-10 shadow-soft sm:px-8 sm:py-14">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
          Brand Brain
        </p>
        <h2 className="mt-3 text-page-hero">Your brand, decoded.</h2>
        <p className="mx-auto mt-3 max-w-xl text-base text-text-secondary">
          We found enough about {brand.companyName} to build a reusable Brand
          Profile that powers strategy and content. Review it before you lock a
          month of ideas.
        </p>
      </div>

      <div className="relative mx-auto mt-12 h-[360px] max-w-3xl sm:h-[420px]">
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,_#EEF1ED_0%,_transparent_65%)]" />
        <div className="absolute top-1/2 left-1/2 flex size-36 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-primary/20 bg-card shadow-soft sm:size-44">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-white">
            <Brain className="size-6" aria-hidden />
          </div>
          <p className="mt-2 text-sm font-semibold">{brand.companyName}</p>
          <p className="text-xs text-text-muted">{brand.confidence}% confidence</p>
        </div>

        {orbitItems.map((item, index) => (
          <div
            key={item.key}
            className={cn(
              "absolute rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium shadow-soft transition-all duration-300",
              item.position,
              index < visibleCount
                ? "animate-pop-in opacity-100"
                : "scale-90 opacity-0"
            )}
          >
            {item.label}
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-center">
        <PrimaryButton onClick={onContinue} className="px-6">
          Review Brand Profile
        </PrimaryButton>
      </div>
    </section>
  );
}
