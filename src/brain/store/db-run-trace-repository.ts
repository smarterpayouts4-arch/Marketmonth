import { desc, eq } from "drizzle-orm";

import { contentRunTraceSchema } from "@/brain/contracts";
import { getDb } from "@/db";
import { contentRunTraces } from "@/db/schema";

import type { RunTraceRepository } from "./run-trace-repository";

export function createDbRunTraceRepository(): RunTraceRepository {
  return {
    async save(input) {
      const trace = contentRunTraceSchema.parse(input.trace);
      const db = getDb();
      await db
        .insert(contentRunTraces)
        .values({
          runId: trace.runId,
          companyId: input.companyId?.trim().toLowerCase() ?? null,
          workflowVersion: trace.workflowVersion,
          finalStatus: trace.finalStatus,
          trace: trace as unknown as Record<string, unknown>,
          createdAt: new Date(trace.createdAt),
        })
        .onConflictDoUpdate({
          target: contentRunTraces.runId,
          set: {
            finalStatus: trace.finalStatus,
            trace: trace as unknown as Record<string, unknown>,
          },
        });
    },

    async getByRunId(runId) {
      const db = getDb();
      const [row] = await db
        .select({ trace: contentRunTraces.trace })
        .from(contentRunTraces)
        .where(eq(contentRunTraces.runId, runId))
        .limit(1);
      return row ? contentRunTraceSchema.parse(row.trace) : null;
    },

    async listByCompany(companyId, options) {
      const id = companyId.trim().toLowerCase();
      const db = getDb();
      const base = db
        .select({ trace: contentRunTraces.trace })
        .from(contentRunTraces)
        .where(eq(contentRunTraces.companyId, id))
        .orderBy(desc(contentRunTraces.createdAt));
      const rows =
        options?.limit != null ? await base.limit(options.limit) : await base;
      return rows.map((r) => contentRunTraceSchema.parse(r.trace));
    },
  };
}
