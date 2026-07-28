/**
 * In-memory rate limit for Project Knowledge ask.
 *
 * Implemented for local / single-instance development protection only.
 * NOT suitable for multi-instance or serverless production enforcement
 * (each instance keeps a separate counter).
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export const ASK_RATE_LIMIT_WINDOW_MS = 60_000;
export const ASK_RATE_LIMIT_MAX = 30;

export function checkAskRateLimit(
  key: string,
  now = Date.now()
): { ok: true } | { ok: false; retryAfterSec: number } {
  const existing = buckets.get(key);
  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + ASK_RATE_LIMIT_WINDOW_MS });
    return { ok: true };
  }
  if (existing.count >= ASK_RATE_LIMIT_MAX) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  existing.count += 1;
  return { ok: true };
}

/** Test helper */
export function resetAskRateLimitForTests(): void {
  buckets.clear();
}
