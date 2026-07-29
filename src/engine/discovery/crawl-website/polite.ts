/** Polite crawl helpers — inter-request delay + short retry backoff. */

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** ~350ms between live fetches (jittered). */
export async function politeDelay(): Promise<void> {
  const ms = 300 + Math.floor(Math.random() * 200);
  await sleep(ms);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts?: { attempts?: number; baseMs?: number }
): Promise<T> {
  const attempts = opts?.attempts ?? 3;
  const baseMs = opts?.baseMs ?? 250;
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (i < attempts - 1) await sleep(baseMs * (i + 1));
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}
