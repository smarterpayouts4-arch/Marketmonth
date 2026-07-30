import type { ContentAtom } from "@/brain/atom";
import type { AtomValidationReport } from "@/brain/atom/validate/types";
import { shortHash } from "@/brain/content/evidence";
import {
  buildIdempotencyKey,
  collectUnresolvedResearch,
  evidenceRefsFromAtom,
  resolvePackageStatus,
} from "@/brain/content-studio/adapters/types";
import {
  loadLatestProductionBundle,
  loadProductionBundle,
  saveProductionBundle,
} from "@/brain/content-studio/bundle-store";
import type {
  ContentProductionBundle,
  YouTubeShortFormatPackage,
} from "@/brain/content-studio/schemas/format-package";
import { getFormat } from "@/brain/content-studio/platform-registry";
import { wordSafeClamp } from "@/brain/lib/word-safe-clamp";
import { createAtomRepository } from "@/brain/store";

import { youtubeShortDurationPolicyError } from "./duration-policy";
import { generateYouTubeShortPackage } from "./specialist";
import {
  channelPackageToYouTubeShortDraft,
  formatPackageToYouTubeShortDraft,
} from "./to-youtube-short-draft";
import {
  youtubeShortDurableEditsSchema,
  type YouTubeShortDraft,
  type YouTubeShortDurableEdits,
} from "./youtube-short-draft";

/** Service / adapter version stamp (shared with format package generation meta). */
export const YOUTUBE_SHORT_SERVICE_VERSION = "youtube-short-format-v1" as const;
export const YOUTUBE_SHORT_TEMPLATE_VERSION =
  "youtube-short-template-v1" as const;

const PROMPT_FIELDS = [
  "imagePrompt",
  "voiceoverPrompt",
  "script",
] as const;

function clamp(value: string, max: number): string {
  return wordSafeClamp(value, max);
}

function baselineFromPackage(
  pkg: Pick<
    YouTubeShortFormatPackage,
    "imagePrompt" | "voiceoverPrompt" | "script"
  >
): YouTubeShortDurableEdits {
  return {
    imagePrompt: pkg.imagePrompt,
    voiceoverPrompt: pkg.voiceoverPrompt,
    script: pkg.script,
  };
}

/**
 * Locked merge policy (ADR 0006 / Phase 2):
 * - Effective fields = durableEdits when present, else generated baseline fields.
 * - On regenerate: refresh generatedBaseline from new generate; re-apply prior durableEdits.
 * - generatedBaseline always recoverable for Reset.
 */
export function applyDurableEditsToShortPackage(
  pkg: YouTubeShortFormatPackage,
  edits: YouTubeShortDurableEdits
): YouTubeShortFormatPackage {
  const parsed = youtubeShortDurableEditsSchema.parse(edits);
  const baseline = pkg.generatedBaseline ?? baselineFromPackage(pkg);
  return {
    ...pkg,
    generatedBaseline: baseline,
    durableEdits: parsed,
    imagePrompt: parsed.imagePrompt,
    voiceoverPrompt: parsed.voiceoverPrompt,
    script: parsed.script,
  };
}

export function resetShortPackageToGeneratedBaseline(
  pkg: YouTubeShortFormatPackage
): YouTubeShortFormatPackage {
  const baseline = pkg.generatedBaseline ?? baselineFromPackage(pkg);
  return {
    ...pkg,
    durableEdits: undefined,
    imagePrompt: baseline.imagePrompt,
    voiceoverPrompt: baseline.voiceoverPrompt,
    script: baseline.script,
    generatedBaseline: baseline,
  };
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

  const scenes = draft.scenes;
  const durationSeconds = draft.durationSeconds;
  const durationError = youtubeShortDurationPolicyError(durationSeconds);
  if (durationError) {
    return { ok: false, errors: [durationError] };
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
    generatedBaseline: {
      imagePrompt: draft.imagePrompt,
      voiceoverPrompt: clamp(draft.voiceoverPrompt, 2000),
      script: draft.script,
    },
  };

  // Merge policy: keep human durable edits across regenerate / version bumps.
  void forceRegenerate;
  if (priorPackage?.durableEdits) {
    formatPkg = applyDurableEditsToShortPackage(
      formatPkg,
      priorPackage.durableEdits
    );
  }

  const validationErrors = validateShortFormatPackage(formatPkg, atom, atomRevision);
  if (validationErrors.length > 0) {
    return { ok: false, errors: validationErrors };
  }

  return {
    ok: true,
    package: formatPkg,
    draft: formatPackageToYouTubeShortDraft(formatPkg),
  };
}

export function validateShortFormatPackage(
  output: YouTubeShortFormatPackage,
  atom: ContentAtom,
  atomRevision: number
): string[] {
  const errors: string[] = [];
  if (output.atomId !== atom.atom_id) {
    errors.push("package atomId mismatch");
  }
  if (output.atomRevision !== atomRevision) {
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
  const durationError = youtubeShortDurationPolicyError(output.durationSeconds);
  if (durationError) {
    errors.push(durationError);
  }
  if (!output.audienceAction.trim()) {
    errors.push("audienceAction required");
  }
  for (const s of output.scenes) {
    if (!s.visualPrompt.trim()) {
      errors.push(`scene ${s.id} missing visualPrompt`);
    }
  }
  return errors;
}

export type PatchShortEditsInput = {
  atomId: string;
  companyIdHint?: string;
  edits?: YouTubeShortDurableEdits;
  /** When true, clear durableEdits and restore generatedBaseline. */
  resetToGenerated?: boolean;
};

export type PatchShortEditsResult =
  | {
      ok: true;
      bundle: ContentProductionBundle;
      package: YouTubeShortFormatPackage;
      draft: YouTubeShortDraft;
      atom: ContentAtom;
      validationReport: AtomValidationReport | null;
      recordRevision: number;
    }
  | { ok: false; error: string; status: number };

/**
 * PATCH durable edits into the Short package inside the existing production bundle.
 */
export async function patchYouTubeShortDurableEdits(
  input: PatchShortEditsInput
): Promise<PatchShortEditsResult> {
  const atomId = input.atomId.trim();
  if (!atomId) {
    return { ok: false, error: "atomId is required", status: 400 };
  }

  const stored = await createAtomRepository().findLatestByAtomId(atomId);
  if (!stored) {
    return { ok: false, error: "Atom not found", status: 404 };
  }

  if (
    input.companyIdHint &&
    stored.company_id.trim().toLowerCase() !==
      input.companyIdHint.trim().toLowerCase()
  ) {
    return { ok: false, error: "Atom not found", status: 404 };
  }

  if (stored.atom.approvalStatus !== "locked") {
    return {
      ok: false,
      error: `Atom must be locked before editing packages (approvalStatus=${stored.atom.approvalStatus})`,
      status: 422,
    };
  }

  const atomRevision = stored.record_revision;
  const bundle =
    loadProductionBundle(stored.atom.atom_id, atomRevision) ??
    loadLatestProductionBundle(stored.atom.atom_id);

  if (!bundle || bundle.atomRevision !== atomRevision) {
    return {
      ok: false,
      error: "No production bundle for this atom revision — produce first",
      status: 404,
    };
  }

  const shortPkg = bundle.packages.find(
    (p): p is YouTubeShortFormatPackage => p.formatId === "youtube_short"
  );
  if (!shortPkg) {
    return {
      ok: false,
      error: "Bundle has no youtube_short package",
      status: 404,
    };
  }

  let nextPkg: YouTubeShortFormatPackage;
  if (input.resetToGenerated) {
    nextPkg = resetShortPackageToGeneratedBaseline(shortPkg);
  } else {
    if (!input.edits) {
      return { ok: false, error: "edits are required", status: 400 };
    }
    nextPkg = applyDurableEditsToShortPackage(
      shortPkg,
      youtubeShortDurableEditsSchema.parse(input.edits)
    );
  }

  const format = getFormat("youtube_short");
  if (!format) {
    return { ok: false, error: "youtube_short format missing", status: 500 };
  }

  const validationErrors = validateShortFormatPackage(
    nextPkg,
    stored.atom,
    atomRevision
  );
  if (validationErrors.length > 0) {
    return {
      ok: false,
      error: validationErrors.join("; "),
      status: 422,
    };
  }

  const now = new Date().toISOString();
  const nextBundle: ContentProductionBundle = {
    ...bundle,
    packages: bundle.packages.map((p) =>
      p.formatId === "youtube_short" ? nextPkg : p
    ),
    updatedAt: now,
  };

  try {
    await saveProductionBundle(nextBundle);
  } catch {
    return {
      ok: false,
      error: "Failed to persist production bundle",
      status: 500,
    };
  }

  return {
    ok: true,
    bundle: nextBundle,
    package: nextPkg,
    draft: formatPackageToYouTubeShortDraft(nextPkg),
    atom: stored.atom,
    validationReport: stored.validation_report ?? null,
    recordRevision: atomRevision,
  };
}

export function shortPackageHasPromptField(
  field: string
): field is (typeof PROMPT_FIELDS)[number] {
  return (PROMPT_FIELDS as readonly string[]).includes(field);
}
