/**
 * Per-provider circuit breaker (P2.2).
 * Closed → open after N consecutive transport failures; after the cooldown
 * one half-open probe is allowed — success closes, failure re-opens.
 */

export type CircuitState = "closed" | "open" | "half_open";

export type CircuitBreakerOptions = {
  failureThreshold?: number;
  cooldownMs?: number;
  now?: () => number;
};

const DEFAULT_FAILURE_THRESHOLD = 5;
const DEFAULT_COOLDOWN_MS = 30_000;

export class CircuitBreaker {
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;
  private readonly now: () => number;

  private consecutiveFailures = 0;
  private openedAt: number | null = null;
  private probeInFlight = false;

  constructor(options?: CircuitBreakerOptions) {
    this.failureThreshold =
      options?.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD;
    this.cooldownMs = options?.cooldownMs ?? DEFAULT_COOLDOWN_MS;
    this.now = options?.now ?? Date.now;
  }

  state(): CircuitState {
    if (this.openedAt === null) return "closed";
    if (this.now() - this.openedAt >= this.cooldownMs) return "half_open";
    return "open";
  }

  /** True when a call may proceed. Half-open admits exactly one probe. */
  canProceed(): boolean {
    const state = this.state();
    if (state === "closed") return true;
    if (state === "open") return false;
    if (this.probeInFlight) return false;
    this.probeInFlight = true;
    return true;
  }

  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.openedAt = null;
    this.probeInFlight = false;
  }

  recordFailure(): void {
    this.probeInFlight = false;
    this.consecutiveFailures += 1;
    if (this.openedAt !== null || this.consecutiveFailures >= this.failureThreshold) {
      // Re-open (fresh cooldown) on any failure while open/half-open,
      // or first open once the threshold is crossed.
      this.openedAt = this.now();
    }
  }
}

const sharedBreakers = new Map<string, CircuitBreaker>();

/** Shared breaker per scope (e.g. "openai:gpt-5.4-nano"). */
export function getSharedCircuitBreaker(scope: string): CircuitBreaker {
  const existing = sharedBreakers.get(scope);
  if (existing) return existing;
  const breaker = new CircuitBreaker();
  sharedBreakers.set(scope, breaker);
  return breaker;
}

/** Test helper */
export function resetSharedCircuitBreakersForTests(): void {
  sharedBreakers.clear();
}
