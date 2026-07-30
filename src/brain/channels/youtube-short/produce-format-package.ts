import type { ContentAtom } from "@/brain/atom";
import type { AtomValidationReport } from "@/brain/atom/validate/types";
import { shortHash } from "@/brain/content/evidence";
import {
  buildIdempotencyKey,
  collectUnresolvedResearch,
  evidenceRefsFromAtom,
  resolvePackageStatus,
} from "@/brain/content-studio/adapters/types";
import type { YouTubeShortFormatPackage } from "@/brain/content-studio/schemas/format-package";
import { wordSafeClamp } from "@/brain/lib/word-safe-clamp";

import { applyDurableEditsToShortPackage } from "./durable-edits";
import { youtubeShortDurationPolicyError } from "./duration-policy";
import {
  YOUTUBE_SHORT_SERVICE_VERSION,
  YOUTUBE_SHORT_TEMPLATE_VERSION,
} from "./service-versions";
import { generateYouTubeShortPackage } from "./specialist";
import {
  channelPackageToYouTubeShortDraft,
  formatPackageToYouTubeShortDraft,
} from "./to-youtube-short-draft";
import { validateShortFormatPackage } from "./validate-format-package";
import {
  youtubeShortGeneratedBaselineSchema,
  type YouTubeShortDraft,
  type YouTubeShortDurableSceneBaseline,
} from "./youtube-short-draft";

function clamp(value: string, max: number): string {
  return wordSafeClamp(value, max);
}

export type ProduceShortFormatInput = {
  atom: ContentAtom;
  validationReport: AtomValidationReport | null | undefined;
  atomRevision: number;
  priorPackage?: YouTubeShortFormatPackage;
  forceRegenerate?: boolean;
};

export type ProduceShortFormatResult =
  | { ok: true; package: YouTubeShortFormatPackage; draft: YouTubeShortDraft }
  | { ok: false; errors: string[] };

/**
 * Atom → channel specialist → Studio Short format package (+ draft).
 * Re-applies prior durableEdits after regenerate (merge policy).
 */
export async function produceYouTubeShortFormatPackage(
  input: ProduceShortFormatInput
): Promise<ProduceShortFormatResult> {
  const { atom, validationReport, atomRevision, priorPackage, forceRegenerate } =
    input;

  if (
    atom.approvalStatus !== "locked" &&
    atom.approvalStatus !== "approved"
  ) {
    return {
      ok: false,
      errors: [
        `atom must be approved or locked (got ${atom.approvalStatus})`,
      ],
    };
  }

  const yt = generateYouTubeShortPackage({ atom });
  if (!yt.ok) {
    return { ok: false, errors: yt.errors };
  }

  const channelPkg = yt.package;
  const unresolved = collectUnresolvedResearch(atom, validationReport);
  const status = resolvePackageStatus(atom, unresolved);
  const key = buildIdempotencyKey({
    atomId: atom.atom_id,
    atomRevision,
    formatId: "youtube_short",
    adapterVersion: YOUTUBE_SHORT_SERVICE_VERSION,
    templateVersion: YOUTUBE_SHORT_TEMPLATE_VERSION,
  });

  const draft = channelPackageToYouTubeShortDraft(channelPkg, {
    source: "atom",
    atomId: atom.atom_id,
    atomRevision,
  });

  const scenes = draft.scenes.map((s) => ({
    ...s,
    assetType: s.assetType ?? ("image" as const),
  }));
  const durationSeconds = draft.durationSeconds;
  const durationError = youtubeShortDurationPolicyError(durationSeconds);
  if (durationError) {
    return { ok: false, errors: [durationError] };
  }

  const sceneBaselines: Record<string, YouTubeShortDurableSceneBaseline> = {};
  for (const scene of scenes) {
    sceneBaselines[scene.id] = {
      visualPrompt: scene.visualPrompt,
      narration: scene.narration,
      onScreenText: scene.onScreenText,
      assetType: scene.assetType,
    };
  }

  let formatPkg: YouTubeShortFormatPackage = {
    id: `fmt_yt_short_${shortHash(`${atom.atom_id}|${atomRevision}|${key}`)}`,
    atomId: atom.atom_id,
    atomRevision,
    formatId: "youtube_short",
    status,
    title: draft.title,
    durationSeconds,
    aspectRatio: "9:16",
    hook: draft.hook,
    voiceoverPrompt: clamp(draft.voiceoverPrompt, 2000),
    imagePrompt: draft.imagePrompt,
    script: draft.script,
    scenes,
    caption: clamp(atom.kernel.payoff, 500),
    audienceAction: clamp(atom.kernel.intended_action, 280),
    brandBridge:
      clamp(atom.distributionContract.ctaIntent ?? "", 280) || undefined,
    disclaimer:
      atom.safety.banned_claims[0] != null
        ? clamp(
            `Avoid: ${atom.safety.banned_claims.slice(0, 2).join("; ")}`,
            280
          )
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
      adapterVersion: YOUTUBE_SHORT_SERVICE_VERSION,
      generatedAt: new Date().toISOString(),
      idempotencyKey: key,
    },
    generatedBaseline: youtubeShortGeneratedBaselineSchema.parse({
      imagePrompt: draft.imagePrompt,
      voiceoverPrompt: clamp(draft.voiceoverPrompt, 2000),
      script: draft.script,
      scenes: sceneBaselines,
    }),
  };

  // Merge policy: keep human durable edits across regenerate / version bumps.
  void forceRegenerate;
  if (priorPackage?.durableEdits) {
    formatPkg = applyDurableEditsToShortPackage(
      formatPkg,
      priorPackage.durableEdits
    );
  }

  const validationErrors = validateShortFormatPackage(
    formatPkg,
    atom,
    atomRevision
  );
  if (validationErrors.length > 0) {
    return { ok: false, errors: validationErrors };
  }

  return {
    ok: true,
    package: formatPkg,
    draft: formatPackageToYouTubeShortDraft(formatPkg),
  };
}
