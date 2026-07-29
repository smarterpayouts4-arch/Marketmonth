import type { ContentRunTrace } from "@/brain/contracts";

/**
 * Durable ContentRunTrace store (P2.1).
 * Callers must use this port — never write trace rows directly.
 */
export type RunTraceRepository = {
  /** Persist one run trace. Idempotent per runId (last write wins). */
  save(input: {
    trace: ContentRunTrace;
    /** Tenant scope for later listing; usually the Brand Core company id. */
    companyId?: string;
  }): Promise<void>;

  getByRunId(runId: string): Promise<ContentRunTrace | null>;

  listByCompany(
    companyId: string,
    options?: { limit?: number }
  ): Promise<ContentRunTrace[]>;
};
