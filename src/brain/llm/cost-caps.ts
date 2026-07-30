import { and, eq, sql } from "drizzle-orm";

import { classifyPgError as classifyPgErrorShared } from "@/db/pg-errors";

/**
 * Per-tenant daily LLM token caps (P2.2), backed by `llm_usage_daily`.
 *
 * Local / unset DATABASE_URL: fail open (no durable store).
 * Cap store unavailable:
 *   - always emit a high-severity operational alert
 *   - production: fail closed
 *   - non-production: fail open (local setup)
 */

const DEFAULT_DAILY_TOKEN_CAP = 500_000;

export type TenantCostCapResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "cap_exceeded"
        | "cap_store_unavailable"
        | "cap_store_missing_table"
        | "cap_store_conflict";
      usedTokens?: number;
      capTokens?: number;
      detail?: string;
    };

function classifyPgError(err: unknown): {
  reason: "cap_store_missing_table" | "cap_store_conflict" | "cap_store_unavailable";
  detail: string;
} {
  const classified = classifyPgErrorShared(err);
  if (classified.reason === "missing_table") {
    return { reason: "cap_store_missing_table", detail: classified.detail };
  }
  if (classified.reason === "conflict") {
    return { reason: "cap_store_conflict", detail: classified.detail };
  }
  return { reason: "cap_store_unavailable", detail: classified.detail };
}

function capFromEnv(): number {
  const raw = Number(process.env.BRAIN_TENANT_DAILY_TOKEN_CAP);
  if (Number.isFinite(raw)) return Math.max(0, Math.floor(raw));
  return DEFAULT_DAILY_TOKEN_CAP;
}

function dbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function alertCapStoreUnavailable(detail: string): void {
  // High-severity operational alert — visible in every environment.
  console.error(
    `[cost-caps][SEVERITY=high] cap_store_unavailable: ${detail}`
  );
}

/** UTC day bucket, e.g. "2026-07-29". */
export function utcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Health probe: can we read llm_usage_daily? */
export async function probeLlmUsageDailyTable(): Promise<{
  ok: boolean;
  detail: string;
}> {
  if (!dbConfigured()) {
    return { ok: false, detail: "DATABASE_URL not configured" };
  }
  try {
    const { getDb } = await import("@/db");
    const { llmUsageDaily } = await import("@/db/schema");
    await getDb().select({ day: llmUsageDaily.day }).from(llmUsageDaily).limit(1);
    return { ok: true, detail: "llm_usage_daily reachable" };
  } catch (err) {
    const classified = classifyPgError(err);
    return { ok: false, detail: `${classified.reason}: ${classified.detail}` };
  }
}

/** Health probe: can we read content_atoms? */
export async function probeContentAtomsTable(): Promise<{
  ok: boolean;
  detail: string;
}> {
  if (!dbConfigured()) {
    return { ok: false, detail: "DATABASE_URL not configured" };
  }
  try {
    const { getDb } = await import("@/db");
    const { contentAtoms } = await import("@/db/schema");
    await getDb()
      .select({ atomId: contentAtoms.atomId })
      .from(contentAtoms)
      .limit(1);
    return { ok: true, detail: "content_atoms reachable" };
  } catch (err) {
    const classified = classifyPgError(err);
    return { ok: false, detail: `${classified.reason}: ${classified.detail}` };
  }
}

export async function checkTenantTokenCap(
  companyId: string
): Promise<TenantCostCapResult> {
  const cap = capFromEnv();
  if (cap <= 0 || !dbConfigured()) return { ok: true };

  try {
    const { getDb } = await import("@/db");
    const { llmUsageDaily } = await import("@/db/schema");
    const id = companyId.trim().toLowerCase();
    const [row] = await getDb()
      .select({ totalTokens: llmUsageDaily.totalTokens })
      .from(llmUsageDaily)
      .where(
        and(eq(llmUsageDaily.companyId, id), eq(llmUsageDaily.day, utcDay()))
      )
      .limit(1);
    const used = row?.totalTokens ?? 0;
    if (used >= cap) {
      return {
        ok: false,
        reason: "cap_exceeded",
        usedTokens: used,
        capTokens: cap,
      };
    }
    return { ok: true };
  } catch (err) {
    const classified = classifyPgError(err);
    alertCapStoreUnavailable(`${classified.reason}: ${classified.detail}`);
    if (isProduction()) {
      return {
        ok: false,
        reason: classified.reason,
        detail: classified.detail,
      };
    }
    // Local / non-production: fail open after alert.
    return { ok: true };
  }
}

export async function recordTenantTokenUsage(
  companyId: string,
  totalTokens: number
): Promise<void> {
  if (!dbConfigured() || !Number.isFinite(totalTokens) || totalTokens <= 0) {
    return;
  }
  try {
    const { getDb } = await import("@/db");
    const { llmUsageDaily } = await import("@/db/schema");
    const id = companyId.trim().toLowerCase();
    const tokens = Math.floor(totalTokens);
    await getDb()
      .insert(llmUsageDaily)
      .values({
        companyId: id,
        day: utcDay(),
        totalTokens: tokens,
        requestCount: 1,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [llmUsageDaily.companyId, llmUsageDaily.day],
        set: {
          totalTokens: sql`${llmUsageDaily.totalTokens} + ${tokens}`,
          requestCount: sql`${llmUsageDaily.requestCount} + 1`,
          updatedAt: new Date(),
        },
      });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    alertCapStoreUnavailable(`usage_record_failed: ${detail}`);
  }
}
