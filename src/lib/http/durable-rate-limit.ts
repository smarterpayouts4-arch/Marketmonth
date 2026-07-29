import { sql } from "drizzle-orm";

import {
  checkRateLimit,
  DEFAULT_RATE_LIMIT_MAX,
  DEFAULT_RATE_LIMIT_WINDOW_MS,
  type RateLimitResult,
} from "./rate-limit";

/**
 * Durable fixed-window rate limit (P2.2), backed by `rate_limit_windows`.
 * Used in production (or with RATE_LIMIT_STORE=db) so counters survive
 * serverless instances; local dev keeps the in-memory limiter.
 * A store outage fails over to the in-memory limiter — availability first.
 */

function durableStoreEnabled(): boolean {
  if (!process.env.DATABASE_URL?.trim()) return false;
  if (process.env.RATE_LIMIT_STORE?.trim().toLowerCase() === "db") return true;
  return process.env.NODE_ENV === "production";
}

async function checkRateLimitDb(
  namespace: string,
  key: string,
  options?: { windowMs?: number; max?: number; now?: number }
): Promise<RateLimitResult> {
  const windowMs = options?.windowMs ?? DEFAULT_RATE_LIMIT_WINDOW_MS;
  const max = options?.max ?? DEFAULT_RATE_LIMIT_MAX;
  const now = options?.now ?? Date.now();
  const bucketKey = `${namespace}:${key}`;
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);

  const { getDb } = await import("@/db");
  const { rateLimitWindows } = await import("@/db/schema");

  // Single atomic upsert: same window → increment; newer window → reset.
  // The CASE reads the pre-update row, so concurrent writers serialize
  // correctly on the primary key.
  const [row] = await getDb()
    .insert(rateLimitWindows)
    .values({ bucketKey, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: rateLimitWindows.bucketKey,
      set: {
        count: sql`CASE WHEN ${rateLimitWindows.windowStart} = ${windowStart} THEN ${rateLimitWindows.count} + 1 ELSE 1 END`,
        windowStart,
      },
    })
    .returning({ count: rateLimitWindows.count });

  if ((row?.count ?? 1) > max) {
    const resetAt = windowStart.getTime() + windowMs;
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((resetAt - now) / 1000)),
    };
  }
  return { ok: true };
}

/**
 * Preferred route entry: durable when configured, in-memory otherwise.
 * Same window/max semantics as `checkRateLimit`.
 */
export async function enforceRateLimit(
  namespace: string,
  key: string,
  options?: { windowMs?: number; max?: number; now?: number }
): Promise<RateLimitResult> {
  if (durableStoreEnabled()) {
    try {
      return await checkRateLimitDb(namespace, key, options);
    } catch (err) {
      console.warn(
        `[rate-limit] durable store failed, using in-memory fallback: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  return checkRateLimit(namespace, key, options);
}
