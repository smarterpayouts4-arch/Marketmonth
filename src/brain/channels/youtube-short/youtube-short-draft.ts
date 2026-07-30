import { z } from "zod";

import {
  YOUTUBE_SHORT_DURATION_DEFAULT_SECONDS,
  YOUTUBE_SHORT_DURATION_MAX_SECONDS,
  YOUTUBE_SHORT_SCENE_DURATION_MAX_SECONDS,
} from "./duration-policy";

/**
 * Normalized YouTube Short draft — convergence contract for:
 *   Manual prompt ─┐
 *                  ├→ YouTube Short channel → Renderer
 *   Content atom ──┘
 *
 * Phase 1: schema + types only. Atom path still produces via specialist +
 * Studio adapter; manual path is not wired. Both must eventually emit this
 * shape (or a strict superset) before render.
 */

export const youtubeShortDraftProvenanceSchema = z.discriminatedUnion(
  "source",
  [
    z.object({
      source: z.literal("atom"),
      atomId: z.string().min(1),
      atomRevision: z.number().int().positive(),
    }),
    z.object({
      source: z.literal("manual"),
      manualDraftId: z.string().min(1),
      companyId: z.string().min(1),
    }),
  ]
);

export const youtubeShortDraftSceneSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().nonnegative(),
  durationSeconds: z
    .number()
    .positive()
    .max(YOUTUBE_SHORT_SCENE_DURATION_MAX_SECONDS),
  narration: z.string().min(1).max(1200),
  onScreenText: z.string().max(160).optional(),
  visualPrompt: z.string().min(1).max(800),
});

/**
 * Durable prompt/script edits persisted on the Short format package inside
 * the existing ContentProductionBundle (not a parallel client-only draft, not a
 * second store). Phase 2+: PATCH merges these fields onto the package in place.
 */
export const youtubeShortDurableEditsSchema = z.object({
  imagePrompt: z.string().min(1).max(800),
  voiceoverPrompt: z.string().min(1).max(2000),
  script: z.string().min(1).max(6000),
});

export const youtubeShortDraftSchema = z.object({
  formatId: z.literal("youtube_short"),
  aspectRatio: z.literal("9:16"),
  title: z.string().min(1).max(100),
  hook: z.string().min(1).max(280),
  script: z.string().min(1).max(6000),
  /** Actual summed scene duration; must be ≤ policy MAX. */
  durationSeconds: z
    .number()
    .positive()
    .max(YOUTUBE_SHORT_DURATION_MAX_SECONDS),
  /**
   * Generation / product aim. Defaults to MarketMonth initial default (60s),
   * not the policy ceiling.
   */
  targetDurationSeconds: z
    .number()
    .positive()
    .max(YOUTUBE_SHORT_DURATION_MAX_SECONDS)
    .default(YOUTUBE_SHORT_DURATION_DEFAULT_SECONDS),
  scenes: z.array(youtubeShortDraftSceneSchema).min(2).max(12),
  imagePrompt: z.string().min(1).max(800),
  voiceoverPrompt: z.string().min(1).max(2000),
  audienceAction: z.string().min(1).max(280).optional(),
  provenance: youtubeShortDraftProvenanceSchema,
});

export type YouTubeShortDraftProvenance = z.infer<
  typeof youtubeShortDraftProvenanceSchema
>;
export type YouTubeShortDraftScene = z.infer<typeof youtubeShortDraftSceneSchema>;
export type YouTubeShortDurableEdits = z.infer<
  typeof youtubeShortDurableEditsSchema
>;
export type YouTubeShortDraft = z.infer<typeof youtubeShortDraftSchema>;
