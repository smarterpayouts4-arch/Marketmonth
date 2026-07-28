/**
 * Thin orchestrator: discovery persistence.
 * Specialists live in ./persist/*
 */
export type {
  PersistedAnalysis,
  PersistedDiscovery,
  PersistedStrategy,
} from "./persist/types";

export {
  findCachedAnalysis,
  getBrandProfileById,
  persistAnalysis,
} from "./persist/db-analysis";

export { persistStrategy } from "./persist/db-strategy";

export {
  memoryGetEvidence,
  memoryPersist,
  memoryPersistAnalysis,
  memoryPersistStrategy,
} from "./persist/memory";

export {
  findCachedDiscovery,
  persistDiscovery,
} from "./persist/legacy";
