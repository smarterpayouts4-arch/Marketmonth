/**
 * Canonical YouTube Short duration policy (server-safe domain constants).
 *
 * Single source for channel package schemas, Studio format schemas, validation,
 * and registry defaults. Do not duplicate numeric duration caps elsewhere.
 *
 * D1 (Phase 1): 60s is MarketMonth's initial product default — not the platform
 * ceiling. Schemas and validators allow up to MAX so the product can grow.
 */

/** Product default target length for new Short drafts / generation aims. */
export const YOUTUBE_SHORT_DURATION_DEFAULT_SECONDS = 60 as const;

/**
 * Absolute maximum total Short duration MarketMonth will accept.
 * Not claimed as YouTube's hard platform limit — product policy ceiling.
 */
export const YOUTUBE_SHORT_DURATION_MAX_SECONDS = 180 as const;

/** Per-scene ceiling (same policy family; total still capped by MAX). */
export const YOUTUBE_SHORT_SCENE_DURATION_MAX_SECONDS =
  YOUTUBE_SHORT_DURATION_MAX_SECONDS;

export function isYouTubeShortDurationWithinPolicy(
  totalSeconds: number
): boolean {
  return (
    Number.isFinite(totalSeconds) &&
    totalSeconds > 0 &&
    totalSeconds <= YOUTUBE_SHORT_DURATION_MAX_SECONDS
  );
}

export function youtubeShortDurationPolicyError(
  totalSeconds: number
): string | null {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return `invalid Short duration ${totalSeconds}s`;
  }
  if (totalSeconds > YOUTUBE_SHORT_DURATION_MAX_SECONDS) {
    return `total scene duration ${totalSeconds}s exceeds ${YOUTUBE_SHORT_DURATION_MAX_SECONDS}s policy max`;
  }
  return null;
}
