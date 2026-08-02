/**
 * Process-local keyed mutex for manual Short generation steps.
 *
 * Duplicate protection is process-local and is not safe across multiple
 * server instances. Sufficient for the single-process NODE_ENV=development
 * milestone; multi-instance deployments need a shared lock (DB/Redis).
 */

const tails = new Map<string, Promise<unknown>>();

export async function withRenderStepLock<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  const prev = tails.get(key) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chained = prev.then(() => gate);
  tails.set(key, chained);

  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (tails.get(key) === chained) {
      tails.delete(key);
    }
  }
}

export function renderStepLockKey(
  step: "image" | "voice" | "video" | "compose" | "assemble",
  atomId: string,
  sceneId?: string
): string {
  return sceneId ? `${step}:${atomId}:${sceneId}` : `${step}:${atomId}`;
}
