"use client";

import {
  FileText,
  MessageSquareText,
  Share2,
  Target,
  Users,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const lookFors = [
  {
    icon: Users,
    title: "Customer base",
    body: "Who you serve, what they care about, and the language they use.",
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
    title: "Questions & trust copy",
    body: "FAQ pages, objections, and trust language we can read on your site.",
  },
  {
    icon: FileText,
    title: "Conversion path",
    body: "The next step you ask for — join, book, buy, or learn more.",
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
    <div className="flex h-full min-h-0 flex-col pb-3">
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={url}
          onChange={(event) => onUrlChange(event.target.value)}
          aria-label="Website URL"
          placeholder="your website"
          disabled={disabled}
          className="h-12 flex-1 bg-background text-[15px] placeholder:text-text-muted/80"
          onKeyDown={(event) => {
            if (event.key === "Enter") onAnalyze();
          }}
        />
        <button
          type="button"
          onClick={onAnalyze}
          disabled={disabled}
          className={cn(
            "inline-flex h-12 shrink-0 items-center justify-center rounded-xl bg-primary px-5 text-[15px] font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary-hover disabled:opacity-60",
            pulseAnalyze && !disabled && "animate-soft-pulse"
          )}
        >
          Analyze my website
        </button>
      </div>

      <div className="mt-6">
        <p className="text-[13px] font-semibold tracking-wide text-text-muted uppercase">
          What we look for
        </p>
        <ul className="mt-4 space-y-5">
          {lookFors.map((item) => (
            <li
              key={item.title}
              className="grid grid-cols-[2rem_1fr] items-start gap-3"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <item.icon className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 space-y-1">
                <p className="text-[14px] font-semibold leading-snug text-foreground">
                  {item.title}
                </p>
                <p className="text-[14px] leading-[1.45] text-text-secondary">
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
