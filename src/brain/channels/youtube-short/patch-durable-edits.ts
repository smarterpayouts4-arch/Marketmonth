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
import { applyShortSceneStructureAction } from "./scene-structure";
import { formatPackageToYouTubeShortDraft } from "./to-youtube-short-draft";
import { validateShortFormatPackage } from "./validate-format-package";
import {
  youtubeShortDurableEditsSchema,
  youtubeShortSceneStructureActionSchema,
  type YouTubeShortDraft,
  type YouTubeShortDurableEdits,
  type YouTubeShortSceneStructureAction,
} from "./youtube-short-draft";

export type PatchShortEditsInput = {
  atomId: string;
  companyIdHint?: string;
  edits?: YouTubeShortDurableEdits;
  /** When true, clear all package-level and scene-level durable overrides. */
  resetToGenerated?: boolean;
  /** When set, remove only that scene's sparse override entry. */
  resetSceneId?: string;
  /** Manual scene count / add / remove (mutually exclusive action). */
  sceneStructure?: YouTubeShortSceneStructureAction;
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
      selectedSceneIdHint?: string;
    }
  | { ok: false; error: string; status: number };

/**
 * PATCH durable edits / scene structure into the Short package inside the
 * existing production bundle.
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
  const hasStructure = input.sceneStructure != null;
  const hasEdits = input.edits != null;
  const actionCount = [
    Boolean(input.resetToGenerated),
    Boolean(resetSceneId),
    hasStructure,
    hasEdits,
  ].filter(Boolean).length;

  if (actionCount !== 1) {
    return {
      ok: false,
      error:
        "Provide exactly one of edits, resetToGenerated, resetSceneId, or sceneStructure",
      status: 400,
    };
  }

  let nextPkg: YouTubeShortFormatPackage;
  let selectedSceneIdHint: string | undefined;

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
  } else if (hasStructure) {
    const parsedStructure = youtubeShortSceneStructureActionSchema.safeParse(
      input.sceneStructure
    );
    if (!parsedStructure.success) {
      return { ok: false, error: "Invalid sceneStructure payload", status: 400 };
    }
    const structured = applyShortSceneStructureAction(
      shortPkg,
      parsedStructure.data
    );
    if (!structured.ok) {
      return { ok: false, error: structured.error, status: 400 };
    }
    nextPkg = structured.package;
    selectedSceneIdHint = structured.selectedSceneIdHint;
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
    selectedSceneIdHint,
  };
}
