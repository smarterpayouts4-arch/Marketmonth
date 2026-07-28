import type { DashboardPhase, HomePhaseStatus } from "@/data/mock-brand";

type StatusArgs = {
  isCompleted: boolean;
  activePhase: DashboardPhase;
};

/** Derive tab statuses for the dashboard workflow (no Learn). */
export function phaseStatuses({
  isCompleted,
  activePhase,
}: StatusArgs): Record<DashboardPhase, HomePhaseStatus> {
  const order: DashboardPhase[] = [
    "marketing-topic",
    "content",
    "review",
    "results",
  ];
  const activeIndex = order.indexOf(activePhase);

  const result = {} as Record<DashboardPhase, HomePhaseStatus>;
  for (let i = 0; i < order.length; i++) {
    const id = order[i];
    if (id === activePhase) {
      result[id] = "active";
    } else if (isCompleted && i < activeIndex) {
      result[id] = "complete";
    } else if (i < activeIndex) {
      result[id] = "complete";
    } else {
      result[id] = "not_started";
    }
  }
  return result;
}
