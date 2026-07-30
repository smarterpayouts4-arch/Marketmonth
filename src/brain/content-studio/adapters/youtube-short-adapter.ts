import { shortHash } from "@/brain/content/evidence";
import { wordSafeClamp } from "@/brain/lib/word-safe-clamp";
import { generateYouTubeShortPackage } from "@/brain/channels/youtube-short";

import type { YouTubeShortFormatPackage } from "../schemas/format-package";
import {
  buildIdempotencyKey,
  collectUnresolvedResearch,
  evidenceRefsFromAtom,
  resolvePackageStatus,
  type ContentFormatAdapter,
  type FormatProductionInput,
  type FormatValidationResult,
} from "./types";

export const YOUTUBE_SHORT_ADAPTER_VERSION = "youtube-short-format-v1" as const;
export const YOUTUBE_SHORT_TEMPLATE_VERSION =
  "youtube-short-template-v1" as const;

function clamp(value: string, max: number): string {
  return wordSafeClamp(value, max);
}

export const youtubeShortAdapter: ContentFormatAdapter<YouTubeShortFormatPackage> =
  {
    formatId: "youtube_short",
    adapterVersion: YOUTUBE_SHORT_ADAPTER_VERSION,
    templateVersion: YOUTUBE_SHORT_TEMPLATE_VERSION,

    canProduce(input) {
      return (
        input.format.id === "youtube_short" &&
        (input.atom.approvalStatus === "locked" ||
          input.atom.approvalStatus === "approved")
      );
    },

    async produce(input: FormatProductionInput): Promise<YouTubeShortFormatPackage> {
      const { atom, validationReport, atomRevision, buildKey } = input;
      const yt = generateYouTubeShortPackage({ atom });
      if (!yt.ok) {
        throw new Error(yt.errors.join("; "));
      }
      const pkg = yt.package;
      const unresolved = collectUnresolvedResearch(atom, validationReport);
      const status = resolvePackageStatus(atom, unresolved);
      const key = buildIdempotencyKey({
        atomId: atom.atom_id,
        atomRevision,
        formatId: "youtube_short",
        adapterVersion: YOUTUBE_SHORT_ADAPTER_VERSION,
        templateVersion: YOUTUBE_SHORT_TEMPLATE_VERSION,
      });

      const scenes = pkg.scenes.map((s, i) => ({
        id: s.scene_id,
        order: i,
        durationSeconds: s.duration_seconds,
        narration: s.spoken_line,
        onScreenText: s.on_screen_text,
        visualPrompt: s.visual_prompt,
      }));

      const durationSeconds = scenes.reduce(
        (sum, s) => sum + s.durationSeconds,
        0
      );

      return {
        id: `fmt_yt_short_${shortHash(`${atom.atom_id}|${atomRevision}|${key}`)}`,
        atomId: atom.atom_id,
        atomRevision,
        formatId: "youtube_short",
        status,
        title: pkg.title,
        durationSeconds,
        aspectRatio: "9:16",
        hook: pkg.spoken_hook,
        voiceoverPrompt: clamp(
          `Narrate clearly, non-hype: ${pkg.voice_direction.tone}. Pace: ${pkg.voice_direction.pace}. Script:\n${pkg.script}`,
          2000
        ),
        imagePrompt: pkg.thumbnail_or_first_frame.image_prompt,
        script: pkg.script,
        scenes,
        caption: clamp(atom.kernel.payoff, 500),
        audienceAction: clamp(atom.kernel.intended_action, 280),
        brandBridge: clamp(atom.distributionContract.ctaIntent ?? "", 280) || undefined,
        disclaimer:
          atom.safety.banned_claims[0] != null
            ? clamp(`Avoid: ${atom.safety.banned_claims.slice(0, 2).join("; ")}`, 280)
            : undefined,
        evidenceRefs: evidenceRefsFromAtom(atom),
        unresolvedResearch: unresolved,
        warnings: [
          ...(validationReport?.warnings?.map((w) => w.message) ?? []),
          "Visual preview only — image/voice/video render stubs are not live.",
        ],
        generation: {
          provider: "deterministic",
          model: "none",
          templateVersion: YOUTUBE_SHORT_TEMPLATE_VERSION,
          adapterVersion: YOUTUBE_SHORT_ADAPTER_VERSION,
          generatedAt: new Date().toISOString(),
          idempotencyKey: key,
        },
      };
    },

    validate(
      output: YouTubeShortFormatPackage,
      input: FormatProductionInput
    ): FormatValidationResult {
      const errors: string[] = [];
      const warnings: string[] = [];
      if (output.atomId !== input.atom.atom_id) {
        errors.push("package atomId mismatch");
      }
      if (output.atomRevision !== input.atomRevision) {
        errors.push("package atomRevision mismatch");
      }
      if (output.aspectRatio !== "9:16") {
        errors.push("youtube_short must be 9:16");
      }
      if (!output.scenes[0]?.narration.trim()) {
        errors.push("opening scene narration required");
      }
      if (
        output.unresolvedResearch.length > 0 &&
        output.status !== "research_required"
      ) {
        errors.push("unresolved research must keep status research_required");
      }
      if (output.durationSeconds > 90) {
        errors.push("short duration exceeds 90s");
      }
      if (!output.audienceAction.trim()) {
        errors.push("audienceAction required");
      }
      for (const s of output.scenes) {
        if (!s.visualPrompt.trim()) {
          errors.push(`scene ${s.id} missing visualPrompt`);
        }
      }
      return { ok: errors.length === 0, errors, warnings };
    },
  };
