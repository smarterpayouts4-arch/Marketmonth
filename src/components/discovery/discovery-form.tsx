"use client";

import {
  FileText,
  Globe,
  MessageSquareText,
  Share2,
  Sparkles,
  Target,
  Users,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PUBLIC_POSITIONING } from "@/seo/config/public-positioning";

const lookFors = [
  {
    icon: Users,
    title: "Offers & customer base",
    body: "Who you serve, what you sell, and the language they already use.",
  },
  {
    icon: Share2,
    title: "Channels",
    body: "Where you already show up online, and gaps worth filling.",
  },
  {
    icon: Target,
    title: "Positioning",
    body: "What you claim to own versus nearby competitors.",
  },
  {
    icon: MessageSquareText,
    title: "Questions & trust signals",
    body: "FAQ pages, objections, and trust language we can read on your site.",
  },
  {
    icon: FileText,
    title: "Conversion path",
    body: "The next step you ask for - join, book, buy, or learn more.",
  },
] as const;

type DiscoveryFormProps = {
  url: string;
  pulseAnalyze?: boolean;
  disabled?: boolean;
  onUrlChange: (value: string) => void;
  onAnalyze: () => void;
};

export function DiscoveryForm({
  url,
  pulseAnalyze = true,
  disabled,
  onUrlChange,
  onAnalyze,
}: DiscoveryFormProps) {
  return (
    <div className="flex h-full min-h-0 flex-col pb-2">
      <div className="mb-5 flex shrink-0 items-start gap-3.5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground sm:size-12">
          <Sparkles className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 pt-0.5">
          <p className="font-serif text-[1.35rem] font-semibold tracking-[-0.02em] text-foreground sm:text-[1.5rem]">
            {PUBLIC_POSITIONING.discoveryTitle}
          </p>
          <p className="mt-1 text-sm leading-snug text-text-secondary sm:text-[15px]">
            {PUBLIC_POSITIONING.discoverySubhead}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Globe
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-text-muted"
            aria-hidden
          />
          <Input
            value={url}
            onChange={(event) => onUrlChange(event.target.value)}
            aria-label="Website URL"
            placeholder="yourwebsite.com"
            disabled={disabled}
            className="h-12 rounded-xl bg-background pl-10 text-[15px] placeholder:text-text-muted/80"
            onKeyDown={(event) => {
              if (event.key === "Enter") onAnalyze();
            }}
          />
        </div>
        <button
          type="button"
          onClick={onAnalyze}
          disabled={disabled}
          className={cn(
            "inline-flex h-12 shrink-0 items-center justify-center rounded-xl bg-primary px-5 text-[15px] font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary-hover disabled:opacity-60",
            pulseAnalyze && !disabled && "animate-soft-pulse"
          )}
        >
          {PUBLIC_POSITIONING.primaryCta}
        </button>
      </div>

      <p className="mt-3 text-[12px] leading-snug text-text-muted">
        {PUBLIC_POSITIONING.freeAnalysisLine}
      </p>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
        <p className="text-[12px] font-semibold tracking-wide text-text-muted uppercase">
          What we look for
        </p>
        <ul className="mt-3 space-y-3.5">
          {lookFors.map((item) => (
            <li
              key={item.title}
              className="grid grid-cols-[2rem_1fr] items-start gap-2.5"
            >
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <item.icon className="size-3.5" aria-hidden />
              </span>
              <div className="min-w-0 space-y-0.5">
                <p className="text-[13px] font-semibold leading-snug text-foreground">
                  {item.title}
                </p>
                <p className="text-[13px] leading-[1.4] text-text-secondary">
                  {item.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
