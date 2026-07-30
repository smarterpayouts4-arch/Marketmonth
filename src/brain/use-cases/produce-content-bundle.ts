import type { ContentAtom } from "@/brain/atom";
import type { AtomValidationReport } from "@/brain/atom/validate/types";
import {
  produceYouTubeShortFormatPackage,
  YOUTUBE_SHORT_SERVICE_VERSION,
  YOUTUBE_SHORT_TEMPLATE_VERSION,
} from "@/brain/channels/youtube-short/youtube-short-service";
import { youtubeVideoAdapter } from "@/brain/content-studio/adapters/youtube-video-adapter";
import type { ContentFormatAdapter } from "@/brain/content-studio/adapters/types";
import {
  loadLatestProductionBundle,
  loadProductionBundle,
  saveProductionBundle,
} from "@/brain/content-studio/bundle-store";
import {
  defaultFormatIdsForYoutube,
  getFormat,
  type ContentFormatId,
} from "@/brain/content-studio/platform-registry";
import type {
  ContentFormatPackage,
  ContentProductionBundle,
  YouTubeShortFormatPackage,
} from "@/brain/content-studio/schemas/format-package";
import { createAtomRepository } from "@/brain/store";

const VIDEO_ADAPTER = youtubeVideoAdapter as ContentFormatAdapter<ContentFormatPackage>;

export type ProduceContentBundleInput = {
  atomId: string;
  /** Optional hint — authorization must still use stored owner company. */
  companyIdHint?: string;
  formatIds?: ContentFormatId[];
  forceRegenerate?: boolean;
};

export type ProduceContentBundleResult =
  | {
      ok: true;
      bundle: ContentProductionBundle;
      atom: ContentAtom;
      validationReport: AtomValidationReport | null;
      recordRevision: number;
      warnings: string[];
      loadedExisting: boolean;
    }
  | {
      ok: false;
      error: string;
      status: number;
      atom?: ContentAtom;
      validationReport?: AtomValidationReport | null;
    };

/**
 * Orchestrator: locked atom → enabled format adapters → persisted bundle.
 * Idempotent unless forceRegenerate.
 */
export async function produceContentBundle(
  input: ProduceContentBundleInput
): Promise<ProduceContentBundleResult> {
  const atomId = input.atomId.trim();
  if (!atomId) {
    return { ok: false, error: "atomId is required", status: 400 };
  }

  const repo = createAtomRepository();
  const stored = await repo.findLatestByAtomId(atomId);
  if (!stored) {
    return { ok: false, error: "Atom not found", status: 404 };
  }

  if (
    input.companyIdHint &&
    stored.company_id.trim().toLowerCase() !==
      input.companyIdHint.trim().toLowerCase()
  ) {
    // Hint mismatch — still return 404 to avoid leaking existence across tenants.
    return { ok: false, error: "Atom not found", status: 404 };
  }

  const atom = stored.atom;
  const validationReport = stored.validation_report ?? null;
  const atomRevision = stored.record_revision;
  const buildKey = stored.build_key ?? `legacy|${atom.atom_id}|${atomRevision}`;

  if (atom.approvalStatus !== "locked") {
    return {
      ok: false,
      error: `Atom must be locked before production (approvalStatus=${atom.approvalStatus})`,
      status: 422,
      atom,
      validationReport,
    };
  }

  const formatIds =
    input.formatIds && input.formatIds.length > 0
      ? input.formatIds
      : defaultFormatIdsForYoutube();

  if (!input.forceRegenerate) {
    const existing = loadProductionBundle(atom.atom_id, atomRevision);
    if (existing) {
      const have = new Set(existing.packages.map((p) => p.formatId));
      const missing = formatIds.filter((id) => !have.has(id));
      if (missing.length === 0) {
        return {
          ok: true,
          bundle: existing,
          atom,
          validationReport,
          recordRevision: atomRevision,
          warnings: [],
          loadedExisting: true,
        };
      }
    }
  }

  const warnings: string[] = [];
  const packages: ContentFormatPackage[] = [];
  const priorBundle =
    loadProductionBundle(atom.atom_id, atomRevision) ??
    loadLatestProductionBundle(atom.atom_id);

  for (const formatId of formatIds) {
    const format = getFormat(formatId);
    if (!format || format.status !== "active") {
      warnings.push(`Format ${formatId} is not active`);
      continue;
    }

    const priorPackage = priorBundle?.packages.find(
      (p) => p.formatId === formatId
    );

    if (formatId === "youtube_short") {
      if (
        !input.forceRegenerate &&
        priorPackage &&
        priorPackage.atomRevision === atomRevision &&
        priorPackage.generation.adapterVersion ===
          YOUTUBE_SHORT_SERVICE_VERSION &&
        priorPackage.generation.templateVersion ===
          YOUTUBE_SHORT_TEMPLATE_VERSION
      ) {
        packages.push(priorPackage);
        continue;
      }

      const priorShort =
        priorPackage?.formatId === "youtube_short"
          ? (priorPackage as YouTubeShortFormatPackage)
          : undefined;

      const shortResult = await produceYouTubeShortFormatPackage({
        atom,
        validationReport,
        atomRevision,
        priorPackage: priorShort,
        forceRegenerate: input.forceRegenerate,
      });
      if (!shortResult.ok) {
        return {
          ok: false,
          error: `Validation failed for youtube_short: ${shortResult.errors.join("; ")}`,
          status: 422,
          atom,
          validationReport,
        };
      }
      packages.push(shortResult.package);
      continue;
    }

    // YouTube Video — unchanged adapter path (Phase 2 must not touch Video).
    const adapter = VIDEO_ADAPTER;
    if (
      !input.forceRegenerate &&
      priorPackage &&
      priorPackage.atomRevision === atomRevision &&
      priorPackage.generation.adapterVersion === adapter.adapterVersion &&
      priorPackage.generation.templateVersion === adapter.templateVersion
    ) {
      packages.push(priorPackage);
      continue;
    }

    const prodInput = {
      atom,
      validationReport,
      atomRevision,
      buildKey,
      format,
      priorPackage,
      forceRegenerate: input.forceRegenerate,
    };

    if (!adapter.canProduce(prodInput)) {
      warnings.push(`Adapter refused ${formatId}`);
      continue;
    }

    try {
      const produced = await adapter.produce(prodInput);
      const validated = adapter.validate(produced, prodInput);
      if (!validated.ok) {
        return {
          ok: false,
          error: `Validation failed for ${formatId}: ${validated.errors.join("; ")}`,
          status: 422,
          atom,
          validationReport,
        };
      }
      warnings.push(...validated.warnings);
      packages.push(produced);
    } catch (err) {
      return {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : `Failed to produce ${formatId}`,
        status: 422,
        atom,
        validationReport,
      };
    }
  }

  if (packages.length === 0) {
    return {
      ok: false,
      error: "No format packages could be produced",
      status: 422,
      atom,
      validationReport,
    };
  }

  // Merge with prior packages so scoped regenerate does not drop other formats.
  const byFormat = new Map<ContentFormatId, ContentFormatPackage>();
  for (const p of priorBundle?.packages ?? []) {
    if (p.atomRevision === atomRevision) {
      byFormat.set(p.formatId, p);
    }
  }
  for (const p of packages) {
    byFormat.set(p.formatId, p);
  }
  const mergedPackages = [...byFormat.values()];

  const now = new Date().toISOString();
  const bundle: ContentProductionBundle = {
    atomId: atom.atom_id,
    atomRevision,
    buildKey,
    companyId: stored.company_id,
    packages: mergedPackages,
    createdAt: priorBundle?.createdAt ?? now,
    updatedAt: now,
  };

  try {
    await saveProductionBundle(bundle);
  } catch {
    warnings.push("Bundle produced but could not be persisted");
  }

  return {
    ok: true,
    bundle,
    atom,
    validationReport,
    recordRevision: atomRevision,
    warnings,
    loadedExisting: false,
  };
}

export async function getContentBundle(input: {
  atomId: string;
}): Promise<ProduceContentBundleResult> {
  const stored = await createAtomRepository().findLatestByAtomId(
    input.atomId.trim()
  );
  if (!stored) {
    return { ok: false, error: "Atom not found", status: 404 };
  }
  const existing = loadProductionBundle(
    stored.atom.atom_id,
    stored.record_revision
  );
  if (!existing) {
    return {
      ok: false,
      error: "No production bundle for this atom revision",
      status: 404,
      atom: stored.atom,
      validationReport: stored.validation_report ?? null,
    };
  }
  return {
    ok: true,
    bundle: existing,
    atom: stored.atom,
    validationReport: stored.validation_report ?? null,
    recordRevision: stored.record_revision,
    warnings: [],
    loadedExisting: true,
  };
}
