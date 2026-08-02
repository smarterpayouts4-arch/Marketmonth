import { computePackageAssemblyReadiness } from "@/brain/content-studio/compute-scene-readiness";
import {
  loadLatestProductionBundle,
  loadProductionBundle,
} from "@/brain/content-studio/bundle-store";
import type {
  ContentProductionBundle,
  YouTubeShortFormatPackage,
} from "@/brain/content-studio/schemas/format-package";
import { createAtomRepository } from "@/brain/store";

import { isAssetCurrent } from "./asset-stale-rules";

export type PreparedPackageAssembly = {
  atomId: string;
  bundle: ContentProductionBundle;
  shortPkg: YouTubeShortFormatPackage;
  clips: Array<{ sceneId: string; url: string; order: number }>;
};

export type PreparePackageAssemblyResult =
  | { ok: true; prepared: PreparedPackageAssembly }
  | {
      ok: false;
      status: number;
      error: string;
      code: string;
      bundle?: ContentProductionBundle;
      readyScenes?: number;
      totalScenes?: number;
    };

/**
 * Validate that every scene has a current (succeeded) composed MP4
 * before full-Short assembly. Stale / missing / running are rejected.
 */
export async function preparePackageAssembly(input: {
  atomId: string;
  companyIdHint?: string;
}): Promise<PreparePackageAssemblyResult> {
  const atomId = input.atomId.trim();
  if (!atomId) {
    return {
      ok: false,
      status: 400,
      error: "atomId is required",
      code: "short_assemble.invalid_request",
    };
  }

  const stored = await createAtomRepository().findLatestByAtomId(atomId);
  if (!stored) {
    return {
      ok: false,
      status: 404,
      error: "Atom not found",
      code: "short_assemble.atom_not_found",
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
      code: "short_assemble.atom_not_found",
    };
  }
  if (stored.atom.approvalStatus !== "locked") {
    return {
      ok: false,
      status: 422,
      error: "Atom must be locked before assembling the final Short",
      code: "short_assemble.atom_not_locked",
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
      code: "short_assemble.format_not_found",
    };
  }

  const shortPkg = bundle.packages.find(
    (p): p is YouTubeShortFormatPackage => p.formatId === "youtube_short"
  );
  if (!shortPkg) {
    return {
      ok: false,
      status: 404,
      error: "Bundle has no youtube_short package",
      code: "short_assemble.format_not_found",
      bundle,
    };
  }

  const readiness = computePackageAssemblyReadiness(shortPkg.scenes);

  if (!readiness.allReady) {
    return {
      ok: false,
      status: 422,
      error: `Cannot assemble — ${readiness.label}. Every scene needs a current composed MP4.`,
      code: "short_assemble.scenes_not_ready",
      bundle,
      readyScenes: readiness.readyScenes,
      totalScenes: readiness.totalScenes,
    };
  }

  const clips: PreparedPackageAssembly["clips"] = [];
  for (const scene of [...shortPkg.scenes].sort((a, b) => a.order - b.order)) {
    const composed = scene.composedVideo;
    const url = composed?.assetUrl?.trim() || "";
    if (!isAssetCurrent(composed?.status) || !url) {
      return {
        ok: false,
        status: 422,
        error: `Scene ${scene.id} composed MP4 is not current`,
        code: "short_assemble.stale_or_missing_scene",
        bundle,
      };
    }
    clips.push({ sceneId: scene.id, url, order: scene.order });
  }

  return {
    ok: true,
    prepared: { atomId: stored.atom.atom_id, bundle, shortPkg, clips },
  };
}
