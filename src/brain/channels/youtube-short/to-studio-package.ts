import type { ContentAtom } from "@/brain/atom";

import type { YouTubeShortPackage } from "./package.schema";

/** Studio preview shape — presentation only; strategy lives on the atom. */
export type StudioProductionPackage = {
  id: string;
  atomId: string;
  channel: "youtube_short";
  format: string;
  version: number;
  copy: {
    openingLine?: string;
    headline?: string;
    body?: string;
    caption?: string;
    description?: string;
    onScreenText?: string[];
  };
  visual: {
    aspectRatio: string;
    visualDirection: string;
    imagePrompt?: string;
    thumbnailPrompt?: string;
  };
  video?: {
    durationSeconds?: number;
    voiceoverScript?: string;
  };
  cta: {
    label?: string;
    action: string;
    destination?: string;
  };
  metadata: {
    title?: string;
  };
  alternateAssets: Array<{
    id: string;
    label: string;
    kind: "headline" | "scene" | "thumbnail";
    headline?: string;
    imagePrompt?: string;
  }>;
  validation: {
    brandAligned: boolean;
    claimsCompliant: boolean;
    readable: boolean;
    requiredFieldsPresent: boolean;
    warnings: string[];
  };
};

export function youtubeShortToStudioPackage(
  atom: ContentAtom,
  pkg: YouTubeShortPackage
): StudioProductionPackage {
  const duration = pkg.scenes.reduce((s, sc) => s + sc.duration_seconds, 0);
  return {
    id: pkg.package_id,
    atomId: atom.atom_id,
    channel: "youtube_short",
    format: "short_video",
    version: pkg.package_version,
    copy: {
      openingLine: pkg.spoken_hook,
      headline: pkg.title,
      body: pkg.script,
      description: atom.promised_payoff,
      onScreenText: pkg.scenes
        .map((s) => s.on_screen_text)
        .filter((t): t is string => Boolean(t)),
    },
    visual: {
      aspectRatio: "9:16",
      visualDirection: atom.visual_concept,
      imagePrompt: pkg.thumbnail_or_first_frame.image_prompt,
      thumbnailPrompt: pkg.thumbnail_or_first_frame.image_prompt,
    },
    video: {
      durationSeconds: duration,
      voiceoverScript: pkg.script,
    },
    cta: {
      label: atom.intended_action,
      action: atom.intended_action,
    },
    metadata: {
      title: pkg.title,
    },
    alternateAssets: pkg.scenes.map((s, i) => ({
      id: s.scene_id,
      label: `Scene ${i + 1}`,
      kind: "scene" as const,
      headline: s.on_screen_text,
      imagePrompt: s.visual_prompt,
    })),
    validation: {
      brandAligned: true,
      claimsCompliant: pkg.status === "validated",
      readable: true,
      requiredFieldsPresent: true,
      warnings: [],
    },
  };
}
