/**
 * In-memory fixed-window rate limit, generalized from the Project Knowledge
 * ask limiter so any API route can share it with its own namespace.
 *
 * Local / single-instance protection only. NOT suitable for multi-instance or
 * serverless production enforcement (each instance keeps separate counters) —
 * a durable store replaces this at scale (plan P2.2).
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
export const DEFAULT_RATE_LIMIT_MAX = 30;

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

export function checkRateLimit(
  namespace: string,
  key: string,
  options?: { windowMs?: number; max?: number; now?: number }
): RateLimitResult {
  const windowMs = options?.windowMs ?? DEFAULT_RATE_LIMIT_WINDOW_MS;
  const max = options?.max ?? DEFAULT_RATE_LIMIT_MAX;
  const now = options?.now ?? Date.now();
  const bucketKey = `${namespace}:${key}`;

  const existing = buckets.get(bucketKey);
  if (!existing || now >= existing.resetAt) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (existing.count >= max) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  existing.count += 1;
  return { ok: true };
}

/** Derive a per-client key from common proxy headers. */
export function rateLimitKeyFromRequest(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local"
  );
}

/**
 * Prefer tenant-scoped rate-limit keys for expensive brain routes.
 * Falls back to IP when user/company are unavailable (pre-parse / anonymous).
 */
export function tenantScopedRateLimitKey(args: {
  userId: string | null;
  companyId?: string | null;
  request: Request;
}): string {
  const company = (args.companyId ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#]/)[0];
  if (args.userId && company) return `${args.userId}:${company}`;
  if (args.userId) return args.userId;
  if (company) return company;
  return rateLimitKeyFromRequest(args.request);
}

/** Test helper */
export function resetRateLimitForTests(): void {
  buckets.clear();
}
