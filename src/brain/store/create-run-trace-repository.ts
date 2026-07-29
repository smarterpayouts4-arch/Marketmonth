import { createDbRunTraceRepository } from "./db-run-trace-repository";
import type { RunTraceRepository } from "./run-trace-repository";

/** No-op adapter for environments without a database (local dev default). */
const NOOP_RUN_TRACE_REPOSITORY: RunTraceRepository = {
  async save() {
    // Traces are still returned in API responses; durable storage requires a DB.
  },
  async getByRunId() {
    return null;
  },
  async listByCompany() {
    return [];
  },
};

/**
 * Sole factory for the run-trace store.
 * DB-backed whenever a database is configured; otherwise a no-op so local
 * workflows without DATABASE_URL keep working (trace still in the response).
 */
export function createRunTraceRepository(): RunTraceRepository {
  if (process.env.DATABASE_URL?.trim()) {
    return createDbRunTraceRepository();
  }
  return NOOP_RUN_TRACE_REPOSITORY;
}
