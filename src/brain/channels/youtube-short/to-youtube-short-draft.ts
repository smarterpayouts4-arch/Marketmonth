import { YOUTUBE_SHORT_DURATION_DEFAULT_SECONDS } from "./duration-policy";
import type { YouTubeShortPackage } from "./package.schema";
import {
  youtubeShortDraftSchema,
  type YouTubeShortDraft,
  type YouTubeShortDraftProvenance,
} from "./youtube-short-draft";

/** Studio format package shape needed for draft mapping (avoids circular import). */
export type ShortFormatPackageDraftSource = {
  atomId: string;
  atomRevision: number;
  title: string;
  hook: string;
  script: string;
  durationSeconds: number;
  imagePrompt: string;
  voiceoverPrompt: string;
  audienceAction?: string;
  scenes: Array<{
    id: string;
    order: number;
    durationSeconds: number;
    narration: string;
    onScreenText?: string;
    visualPrompt: string;
    assetType?: "image" | "video";
  }>;
};

/**
 * Map channel specialist package → normalized YouTubeShortDraft.
 */
export function channelPackageToYouTubeShortDraft(
  pkg: YouTubeShortPackage,
  provenance: YouTubeShortDraftProvenance
): YouTubeShortDraft {
  const scenes = pkg.scenes.map((s, i) => ({
    id: s.scene_id,
    order: i,
    durationSeconds: s.duration_seconds,
    narration: s.spoken_line,
    onScreenText: s.on_screen_text,
    visualPrompt: s.visual_prompt,
    assetType: "image" as const,
  }));
  const durationSeconds = scenes.reduce((sum, s) => sum + s.durationSeconds, 0);
  const draft = {
    formatId: "youtube_short" as const,
    aspectRatio: "9:16" as const,
    title: pkg.title,
    hook: pkg.spoken_hook,
    script: pkg.script,
    durationSeconds,
    targetDurationSeconds:
      pkg.render_plan.target_duration_seconds ||
      YOUTUBE_SHORT_DURATION_DEFAULT_SECONDS,
    scenes,
    imagePrompt: pkg.thumbnail_or_first_frame.image_prompt,
    voiceoverPrompt: `Narrate clearly, non-hype: ${pkg.voice_direction.tone}. Pace: ${pkg.voice_direction.pace}. Script:\n${pkg.script}`,
    provenance,
  };
  return youtubeShortDraftSchema.parse(draft);
}

/**
 * Map Studio Short format package (effective fields) → YouTubeShortDraft.
 */
export function formatPackageToYouTubeShortDraft(
  pkg: ShortFormatPackageDraftSource
): YouTubeShortDraft {
  const draft = {
    formatId: "youtube_short" as const,
    aspectRatio: "9:16" as const,
    title: pkg.title,
    hook: pkg.hook,
    script: pkg.script,
    durationSeconds: pkg.durationSeconds,
    targetDurationSeconds: YOUTUBE_SHORT_DURATION_DEFAULT_SECONDS,
    scenes: pkg.scenes.map((s) => ({
      id: s.id,
      order: s.order,
      durationSeconds: s.durationSeconds,
      narration: s.narration,
      onScreenText: s.onScreenText,
      visualPrompt: s.visualPrompt,
      assetType: s.assetType ?? ("image" as const),
    })),
    imagePrompt: pkg.imagePrompt,
    voiceoverPrompt: pkg.voiceoverPrompt,
    audienceAction: pkg.audienceAction,
    provenance: {
      source: "atom" as const,
      atomId: pkg.atomId,
      atomRevision: pkg.atomRevision,
    },
  };
  return youtubeShortDraftSchema.parse(draft);
}
