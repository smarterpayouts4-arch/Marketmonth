import { Calendar, FileText, Share2, Target, TrendingUp } from "lucide-react";

import {
  monthPlanBody,
  monthPlanEyebrow,
  monthPlanHeadline,
} from "@/components/landing/landing-copy";

import { augustMonthPlan } from "./data";
import { ALL_SOCIAL_CHANNELS } from "./types";

const FEATURE_BULLETS = [
  {
    icon: Target,
    title: "Strategy-first",
    detail: "Everything starts with insights, not templates.",
  },
  {
    icon: Calendar,
    title: "Illustrative month",
    detail: "Example roadmap layout - not generated customer output.",
  },
];

/**
 * "Pieces" and "Possibilities" are aspirational preview copy (this card is
 * explicitly labeled PREVIEW, same honesty convention as the roadmap's own
 * "Illustrative demo month" badge below it) - Weeks and Channels are the two
 * figures with a clean 1:1 mapping to real data, so those are derived
 * instead of hardcoded.
 */
const GLANCE_STATS = [
  { icon: Calendar, value: String(augustMonthPlan.length), label: "Weeks" },
  { icon: FileText, value: "16", label: "Pieces" },
  {
    icon: Share2,
    value: String(ALL_SOCIAL_CHANNELS.length),
    label: "Channels",
  },
  { icon: TrendingUp, value: "\u221e", label: "Possibilities" },
];

/**
 * Header band for the monthly-plan card - introduces the roadmap below it
 * as one unified module instead of a separate floating heading. Lives
 * inside the same outer rounded shell as the roadmap (see `month-plan.tsx`),
 * so it reads as a premium intro "tab" attached to the planner rather than
 * a standalone section.
 */
export function MonthPlanIntroHeader() {
  const [headlineLead, headlineTrail] = monthPlanHeadline.split(". ");

  return (
    <div className="relative grid items-center gap-6 border-b border-border bg-primary/5 px-4 py-6 sm:gap-8 sm:px-6 sm:py-7 md:grid-cols-[5fr_5fr] lg:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:18px_18px]"
      />

      <div className="relative z-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">
          {monthPlanEyebrow}
        </p>
        <h3 className="mt-2 font-display text-xl font-semibold leading-tight tracking-[-0.02em] text-foreground sm:text-2xl">
          {headlineLead}.
          <br />
          {headlineTrail}
        </h3>
        <p className="mt-2.5 max-w-[52ch] text-sm leading-relaxed text-text-secondary sm:text-[15px]">
          {monthPlanBody}
        </p>

        <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-4">
          {FEATURE_BULLETS.map((bullet) => (
            <li key={bullet.title} className="flex max-w-[16rem] items-start gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <bullet.icon className="size-4" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-foreground">
                  {bullet.title}
                </span>
                <span className="block text-xs leading-snug text-text-secondary">
                  {bullet.detail}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative z-10 rounded-2xl bg-primary-dark p-6 text-primary-foreground shadow-lift sm:p-7">
        <div className="flex items-center justify-between gap-2">
          <p className="text-base font-semibold">Example August at a glance</p>
          <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em]">
            Illustrative
          </span>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-3">
          {GLANCE_STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-1.5 text-center">
              <stat.icon className="size-5 text-primary-foreground/70" />
              <span className="text-xl font-bold sm:text-2xl">{stat.value}</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-primary-foreground/70 sm:text-xs">
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-5 border-t border-white/15 pt-4 text-sm text-primary-foreground/75">
          Demo mix for concept only - not a live customer plan.
        </p>
      </div>
    </div>
  );
}
