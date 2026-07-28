import type { DashboardPhase } from "@/data/mock-brand";

export type NextCtaAction = "none";

export type NextCtaModel = {
  label: string;
  description: string;
  cta: string;
  href?: string;
  action: NextCtaAction;
  pending: boolean;
  /** When true, hide the bottom NextAction chrome. */
  hidden: boolean;
};

type NextCtaArgs = {
  activePhase: DashboardPhase;
  isCompleted: boolean;
};

/**
 * Phase-aware next-action copy for DashboardHome.
 * Marketing Topic continues to Content on direction select (no sticky footer).
 * Content lives at /content — not a dashboard status panel.
 */
export function nextCtaModel({
  activePhase,
  isCompleted,
}: NextCtaArgs): NextCtaModel {
  if (activePhase === "marketing-topic" || activePhase === "content") {
    return {
      label: "Next step",
      description: "",
      cta: "",
      action: "none",
      pending: false,
      hidden: true,
    };
  }

  if (activePhase === "review") {
    return {
      label: "Next step",
      description: isCompleted
        ? "Approve the next items in your queue."
        : "Review unlocks after content is ready.",
      cta: isCompleted ? "Review next item" : "Back to Marketing Topic",
      href: isCompleted ? "/review" : "/dashboard?phase=marketing-topic",
      action: "none",
      pending: false,
      hidden: false,
    };
  }

  return {
    label: "Next step",
    description: isCompleted
      ? "Carry these lessons into next month’s plan."
      : "Results appear after you publish.",
    cta: isCompleted ? "Apply to next month" : "Back to Marketing Topic",
    href: "/dashboard?phase=marketing-topic",
    action: "none",
    pending: false,
    hidden: false,
  };
}
