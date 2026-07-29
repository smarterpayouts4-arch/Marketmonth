/**
 * FIFO semaphore for provider concurrency (P2.2): bounds simultaneous
 * OpenAI calls per process so a burst of runs queues instead of stampeding
 * the provider (and tripping 429s).
 */

export class Semaphore {
  private inFlight = 0;
  private readonly waiters: Array<() => void> = [];

  constructor(private readonly limit: number) {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new Error(`Semaphore limit must be a positive integer, got ${limit}`);
    }
  }

  /** Resolves with a release function once a slot is free. */
  acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      const grant = () => {
        this.inFlight += 1;
        let released = false;
        resolve(() => {
          if (released) return;
          released = true;
          this.inFlight -= 1;
          const next = this.waiters.shift();
          if (next) next();
        });
      };
      if (this.inFlight < this.limit) {
        grant();
      } else {
        this.waiters.push(grant);
      }
    });
  }

  activeCount(): number {
    return this.inFlight;
  }

  queuedCount(): number {
    return this.waiters.length;
  }
}

const DEFAULT_OPENAI_CONCURRENCY = 4;

function resolveLimit(): number {
  const raw = Number(process.env.OPENAI_MAX_CONCURRENCY);
  return Number.isInteger(raw) && raw >= 1 ? raw : DEFAULT_OPENAI_CONCURRENCY;
}

let shared: Semaphore | null = null;

export function getOpenAiSemaphore(): Semaphore {
  if (!shared) shared = new Semaphore(resolveLimit());
  return shared;
}

/** Test helper */
export function resetOpenAiSemaphoreForTests(): void {
  shared = null;
}
