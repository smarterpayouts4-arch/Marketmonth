/**
 * Per-step in-flight / timeout helpers for manual Short generation.
 * Windows match plan: image 120s, voice 180s, video 360s, compose 240s.
 *
 * Pair with `withRenderStepLock` so check → persist(running) is atomic
 * within one Node process. Duplicate protection is process-local and is
 * not safe across multiple server instances.
 *
 * Timed-out `running` must not mutate on GET. Prepare paths persist
 * `failed` and return 409; the operator explicitly retries.
 */

export const RENDER_TIMEOUT_MS = {
  image: 120_000,
  voice: 180_000,
  video: 360_000,
  compose: 240_000,
  assemble: 300_000,
} as const;

export type RenderStepKind = keyof typeof RENDER_TIMEOUT_MS;

export type InFlightAsset = {
  status?: string;
  startedAt?: string;
  requestedAt?: string;
  attempt?: number;
};

export type InFlightCheckResult =
  | { ok: true }
  | {
      ok: false;
      kind: "conflict" | "timed_out";
      status: number;
      code: string;
      error: string;
    };

function startedMs(asset: InFlightAsset | undefined): number | null {
  const raw = asset?.startedAt ?? asset?.requestedAt;
  if (!raw) return null;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : null;
}

/**
 * If status is running and within the timeout window → conflict (409).
 * If status is running but past the window → timed_out (caller should mark failed).
 */
export function checkInFlight(
  asset: InFlightAsset | undefined,
  step: RenderStepKind,
  nowMs: number = Date.now()
): InFlightCheckResult {
  if (asset?.status !== "running" && asset?.status !== "queued") {
    return { ok: true };
  }

  const started = startedMs(asset);
  const windowMs = RENDER_TIMEOUT_MS[step];
  if (started != null && nowMs - started > windowMs) {
    return {
      ok: false,
      kind: "timed_out",
      status: 409,
      code: `short_${step}.stale_running`,
      error:
        "Generation may have stopped unexpectedly. Retry to continue.",
    };
  }

  const label =
    step === "image"
      ? "Image"
      : step === "voice"
        ? "Voice"
        : step === "video"
          ? "Video"
          : step === "compose"
            ? "Composition"
            : "Assembly";

  return {
    ok: false,
    kind: "conflict",
    status: 409,
    code: `short_${step}.already_running`,
    error: `${label} generation is already running.`,
  };
}

/** Prior successful asset fields to preserve on failure. */
export function priorSucceededAssetFields<
  T extends {
    status?: string;
    assetUrl?: string;
    assetRef?: string;
    mimeType?: string;
    durationSeconds?: number;
    width?: number;
    height?: number;
    storageProvider?: string;
    storageFileId?: string;
  },
>(prior: T | undefined): Partial<T> {
  if (!prior) return {};
  if (
    prior.status !== "succeeded" &&
    prior.status !== "stale" &&
    prior.status !== "stubbed" &&
    prior.status !== "dry_run_succeeded"
  ) {
    return {};
  }
  if (!prior.assetUrl && !prior.assetRef) return {};
  return {
    assetRef: prior.assetRef,
    assetUrl: prior.assetUrl,
    mimeType: prior.mimeType,
    durationSeconds: prior.durationSeconds,
    width: prior.width,
    height: prior.height,
    storageProvider: prior.storageProvider,
    storageFileId: prior.storageFileId,
  } as Partial<T>;
}

export function nextAttempt(prior: InFlightAsset | undefined): number {
  return (prior?.attempt ?? 0) + 1;
}

/** Pure read: running past the step window (UI "Interrupted"; no mutation). */
export function isRunningTimedOut(
  asset: InFlightAsset | undefined,
  step: RenderStepKind,
  nowMs: number = Date.now()
): boolean {
  if (asset?.status !== "running" && asset?.status !== "queued") {
    return false;
  }
  const started = startedMs(asset);
  if (started == null) return false;
  return nowMs - started > RENDER_TIMEOUT_MS[step];
}
