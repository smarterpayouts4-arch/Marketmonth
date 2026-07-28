"use client";

import {
  BookOpen,
  Check,
  Cog,
  GitCompare,
  HelpCircle,
  Leaf,
  Scale,
  Shield,
  Zap,
  type LucideIcon,
} from "lucide-react";

import type { ContentAngle, ContentVariation } from "./types";

type ContentVariationCardProps = {
  variation: ContentVariation;
  selected: boolean;
  disabled?: boolean;
  onSelect: (id: string) => void;
};

const ANGLE_META: Record<
  ContentAngle,
  { label: string; Icon: LucideIcon }
> = {
  beginner_guide: { label: "Beginner Guide", Icon: BookOpen },
  faq: { label: "FAQ", Icon: HelpCircle },
  problem_solution: { label: "Problem / Solution", Icon: Leaf },
  decision_guide: { label: "Decision Guide", Icon: Scale },
  comparison: { label: "Comparison", Icon: GitCompare },
  trust_transparency: { label: "Trust", Icon: Shield },
  how_it_works: { label: "How It Works", Icon: Cog },
  action_oriented: { label: "Action", Icon: Zap },
  other: { label: "Direction", Icon: BookOpen },
};

export function ContentVariationCard({
  variation,
  selected,
  disabled,
  onSelect,
}: ContentVariationCardProps) {
  const meta = ANGLE_META[variation.angle] ?? ANGLE_META.other;
  const Icon = meta.Icon;
  const title =
    variation.specificTopic?.trim() || variation.punchline.trim();
  const summary =
    variation.ideaSummary?.trim() ||
    variation.corePromise?.trim() ||
    variation.brief?.trim() ||
    variation.subheading;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={() => onSelect(variation.id)}
      className={[
        "relative flex h-full min-h-[148px] w-full flex-col rounded-xl border px-4 py-3.5 text-left transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        selected
          ? "border-primary bg-primary/5 shadow-[inset_0_0_0_1px_var(--primary)]"
          : "border-border bg-card hover:border-primary/35 hover:bg-card/90",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      ].join(" ")}
    >
      {selected ? (
        <span
          className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
          aria-hidden
        >
          <Check className="size-3 stroke-[3]" />
        </span>
      ) : null}

      <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.12em] text-text-muted uppercase">
        <Icon className="size-3.5 text-primary" aria-hidden />
        {meta.label}
      </span>
      <span className="mt-2 line-clamp-2 pr-6 text-base font-semibold leading-snug text-foreground">
        {title}
      </span>
      <span className="mt-2 line-clamp-3 text-sm leading-snug text-text-secondary">
        {summary}
      </span>
      <span className="mt-auto pt-3 text-xs font-medium leading-snug text-primary line-clamp-2">
        {variation.audienceProblem
          ? `Problem · ${variation.audienceProblem}`
          : `Strategic purpose · ${variation.strategicPurpose}`}
      </span>
    </button>
  );
}
