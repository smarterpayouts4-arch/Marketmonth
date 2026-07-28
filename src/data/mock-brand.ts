/**
 * Thin orchestrator: mock brand fixtures.
 * Specialists live in ./mock-brand/*
 */
export type {
  BrandChecklistItem,
  BrandProfile,
  DashboardPhase,
  HomePhaseId,
  HomePhaseStatus,
} from "./mock-brand/types";

export { dashboardPhases, homePhases } from "./mock-brand/phases";
export { scanSteps } from "./mock-brand/scan";
export { completedBrand } from "./mock-brand/profile";
