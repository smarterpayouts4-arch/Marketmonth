import type { ContentAtom } from "@/brain/atom";
import type { AtomValidationReport } from "@/brain/atom/validate/types";
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
import { createAtomRepository } from "@/brain/store";

import {
  applyDurableEditsToShortPackage,
  resetShortPackageToGeneratedBaseline,
  resetShortSceneToGeneratedBaseline,
} from "./durable-edits";
import { formatPackageToYouTubeShortDraft } from "./to-youtube-short-draft";
import { validateShortFormatPackage } from "./validate-format-package";
import {
  youtubeShortDurableEditsSchema,
  type YouTubeShortDraft,
  type YouTubeShortDurableEdits,
} from "./youtube-short-draft";

export type PatchShortEditsInput = {
  atomId: string;
  companyIdHint?: string;
  edits?: YouTubeShortDurableEdits;
  /** When true, clear all package-level and scene-level durable overrides. */
  resetToGenerated?: boolean;
  /** When set, remove only that scene's sparse override entry. */
  resetSceneId?: string;
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

  const resetSceneId = input.resetSceneId?.trim();
  if (input.resetToGenerated && resetSceneId) {
    return {
      ok: false,
      error: "resetToGenerated and resetSceneId are mutually exclusive",
      status: 400,
    };
  }

  let nextPkg: YouTubeShortFormatPackage;
  if (input.resetToGenerated) {
    nextPkg = resetShortPackageToGeneratedBaseline(shortPkg);
  } else if (resetSceneId) {
    if (!shortPkg.scenes.some((s) => s.id === resetSceneId)) {
      return {
        ok: false,
        error: `Unknown scene id: ${resetSceneId}`,
        status: 400,
      };
    }
    nextPkg = resetShortSceneToGeneratedBaseline(shortPkg, resetSceneId);
  } else {
    if (!input.edits) {
      return { ok: false, error: "edits are required", status: 400 };
    }
    const parsed = youtubeShortDurableEditsSchema.safeParse(input.edits);
    if (!parsed.success) {
      return { ok: false, error: "Invalid edits payload", status: 400 };
    }
    nextPkg = applyDurableEditsToShortPackage(shortPkg, parsed.data);
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
