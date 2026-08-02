import type { ContentAtom } from "@/brain/atom";
import {
  loadLatestProductionBundle,
  loadProductionBundle,
} from "@/brain/content-studio/bundle-store";
import type {
  ContentProductionBundle,
  SceneCard,
  YouTubeShortFormatPackage,
} from "@/brain/content-studio/schemas/format-package";
import { createAtomRepository } from "@/brain/store";

export type ResolveLockedShortSceneInput = {
  atomId: string;
  sceneId: string;
  companyIdHint?: string;
  formatId?: string;
  /** Error code prefix, e.g. short_voice / short_video / short_compose */
  codePrefix: string;
  /** e.g. "scene voice" → "Only youtube_short scene voice is supported" */
  featureLabel: string;
  /** e.g. "generating voice" → "Atom must be locked before generating voice" */
  lockedAction: string;
};

export type ResolvedLockedShortScene = {
  atomId: string;
  sceneId: string;
  companyId: string;
  atom: ContentAtom;
  atomRevision: number;
  bundle: ContentProductionBundle;
  shortPkg: YouTubeShortFormatPackage;
  scene: SceneCard;
};

export type ResolveLockedShortSceneError = {
  ok: false;
  status: number;
  error: string;
  code: string;
  bundle?: ContentProductionBundle;
};

export type ResolveLockedShortSceneResult =
  | { ok: true; resolved: ResolvedLockedShortScene }
  | ResolveLockedShortSceneError;

/**
 * Shared preamble for Short scene media ops:
 * validate ids → load locked atom → load matching production bundle → resolve scene.
 * Domain gates (empty narration, missing still, drift, …) stay in each prepare step.
 */
export async function resolveLockedShortScene(
  input: ResolveLockedShortSceneInput
): Promise<ResolveLockedShortSceneResult> {
  const atomId = input.atomId.trim();
  const sceneId = input.sceneId.trim();
  const prefix = input.codePrefix;

  if (!atomId || !sceneId) {
    return {
      ok: false,
      status: 400,
      error: "atomId and sceneId are required",
      code: `${prefix}.invalid_request`,
    };
  }
  if (input.formatId != null && input.formatId !== "youtube_short") {
    return {
      ok: false,
      status: 400,
      error: `Only youtube_short ${input.featureLabel} is supported`,
      code: `${prefix}.invalid_request`,
    };
  }

  const stored = await createAtomRepository().findLatestByAtomId(atomId);
  if (!stored) {
    return {
      ok: false,
      status: 404,
      error: "Atom not found",
      code: `${prefix}.atom_not_found`,
    };
  }
  if (
    input.companyIdHint &&
    stored.company_id.trim().toLowerCase() !==
      input.companyIdHint.trim().toLowerCase()
  ) {
    return {
      ok: false,
      status: 404,
      error: "Atom not found",
      code: `${prefix}.atom_not_found`,
    };
  }
  if (stored.atom.approvalStatus !== "locked") {
    return {
      ok: false,
      status: 422,
      error: `Atom must be locked before ${input.lockedAction}`,
      code: `${prefix}.atom_not_locked`,
    };
  }

  const atomRevision = stored.record_revision;
  const bundle =
    loadProductionBundle(stored.atom.atom_id, atomRevision) ??
    loadLatestProductionBundle(stored.atom.atom_id);
  if (!bundle || bundle.atomRevision !== atomRevision) {
    return {
      ok: false,
      status: 404,
      error: "No production bundle for this atom revision — produce first",
      code: `${prefix}.format_not_found`,
    };
  }

  const shortPkg = bundle.packages.find(
    (p): p is YouTubeShortFormatPackage => p.formatId === "youtube_short"
  );
  if (!shortPkg) {
    return {
      ok: false,
      status: 404,
      error: "YouTube Short package not found",
      code: `${prefix}.format_not_found`,
      bundle,
    };
  }

  const scene = shortPkg.scenes.find((s) => s.id === sceneId);
  if (!scene) {
    return {
      ok: false,
      status: 400,
      error: `Unknown sceneId: ${sceneId}`,
      code: `${prefix}.scene_not_found`,
      bundle,
    };
  }

  return {
    ok: true,
    resolved: {
      atomId: stored.atom.atom_id,
      sceneId,
      companyId: stored.company_id,
      atom: stored.atom,
      atomRevision,
      bundle,
      shortPkg,
      scene,
    },
  };
}
