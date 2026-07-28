"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { MARKETING_TOPIC_HREF } from "@/components/dashboard/dashboard-home/phase-query";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BrandApproved() {
  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-border bg-card px-6 py-14 text-center shadow-soft animate-fade-in">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-success/10 text-success">
        <CheckCircle2 className="size-8" aria-hidden />
      </div>
      <h2 className="mt-6 text-page-title">Brand Profile Approved ✓</h2>
      <p className="mt-3 text-base text-text-secondary">
        Next: Let&apos;s get started. We&apos;ll turn this Brand Brain into six
        directions and a monthly plan.
      </p>
      <Link
        href={MARKETING_TOPIC_HREF}
        className={cn(
          buttonVariants(),
          "mt-8 inline-flex h-10 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
        )}
      >
        Let&apos;s get started
      </Link>
    </section>
  );
}
