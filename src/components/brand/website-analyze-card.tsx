"use client";

import { ShieldCheck } from "lucide-react";

import { Input } from "@/components/ui/input";
import { PrimaryButton } from "@/components/ui/primary-button";

type WebsiteAnalyzeCardProps = {
  value: string;
  onChange: (value: string) => void;
  onAnalyze: () => void;
  disabled?: boolean;
};

export function WebsiteAnalyzeCard({
  value,
  onChange,
  onAnalyze,
  disabled,
}: WebsiteAnalyzeCardProps) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8">
      <label htmlFor="website-url" className="text-sm font-semibold text-foreground">
        Your website
      </label>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <Input
          id="website-url"
          type="url"
          inputMode="url"
          placeholder="https://example.com"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 rounded-xl border-border bg-background px-4 text-base"
          disabled={disabled}
        />
        <PrimaryButton
          className="h-12 shrink-0 px-6"
          onClick={onAnalyze}
          disabled={disabled}
        >
          Analyze My Website
        </PrimaryButton>
      </div>
      <p className="mt-4 text-sm text-text-secondary">
        We&apos;ll look for your products, audience, questions and trust copy, brand voice, colors and
        value proposition.
      </p>
      <p className="mt-3 inline-flex items-center gap-2 text-xs text-text-muted">
        <ShieldCheck className="size-3.5 text-success" aria-hidden />
        Nothing is published without your approval.
      </p>
    </section>
  );
}
