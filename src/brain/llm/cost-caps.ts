import { and, eq, sql } from "drizzle-orm";

/**
 * Per-tenant daily LLM token caps (P2.2), backed by `llm_usage_daily`.
 * Without a database (local dev default) the cap is not enforced —
 * usage tracking requires durable storage.
 */

const DEFAULT_DAILY_TOKEN_CAP = 500_000;

export type TenantCostCapResult =
  | { ok: true }
  | { ok: false; usedTokens: number; capTokens: number };

function capFromEnv(): number {
  const raw = Number(process.env.BRAIN_TENANT_DAILY_TOKEN_CAP);
  if (Number.isFinite(raw)) return Math.max(0, Math.floor(raw));
  return DEFAULT_DAILY_TOKEN_CAP;
}

function dbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/** UTC day bucket, e.g. "2026-07-29". */
export function utcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
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
      return { ok: false, usedTokens: used, capTokens: cap };
    }
    return { ok: true };
  } catch (err) {
    // Fail open: a cap-store outage must not take generation down.
    console.warn(
      `[cost-caps] cap check failed (allowing call): ${err instanceof Error ? err.message : String(err)}`
    );
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
    console.warn(
      `[cost-caps] usage record failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
