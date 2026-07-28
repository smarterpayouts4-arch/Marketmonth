import type { DashboardPhase } from "./types";

export const homePhases = [
  { id: "marketing-topic", label: "Marketing Topic" },
  { id: "content", label: "Content" },
  { id: "review", label: "Review" },
  { id: "results", label: "Results" },
] as const satisfies ReadonlyArray<{ id: DashboardPhase; label: string }>;

export const dashboardPhases = homePhases;
