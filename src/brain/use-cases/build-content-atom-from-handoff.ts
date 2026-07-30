import type {
  AtomBuildTrace,
  AtomValidationReport,
  ContentAtom,
} from "@/brain/atom";
import {
  ATOM_PROMPT_VERSION,
  atomBuildKeyFromEnvelope,
  buildAtomEnvelope,
  buildSelectedDirectionContract,
  runEvidenceSufficiencyPreflight,
} from "@/brain/atom";
import { parseTopicCategory } from "@/brain/content/topic-category";
import type { ContentDirectionsHandoffV1 } from "@/brain/content/types";
import type { BrandCore } from "@/brain/core";
import { resolveBrandCoreIdentity } from "@/brain/core/brand-core-identity";
import { pipelineTrace } from "@/brain/debug/pipeline-trace";
import { runCoreContentBrain } from "@/brain/pipeline";
import { PRODUCT_ATOM_PREFER_LLM } from "@/brain/policy/provider-policy";
import { createAtomRepository } from "@/brain/store";

import { loadBrandContextForAtom } from "./load-brand-context-for-atom";

export type BuildContentAtomFromHandoffInput = {
  handoff: ContentDirectionsHandoffV1;
  domain: string;
  selectedVariationId?: string;
  fixturePath?: string;
  /** Persist via AtomRepository with buildKey idempotency (default true). */
  persist?: boolean;
};

export type BuildContentAtomFromHandoffResult =
  | {
      ok: true;
      atom: ContentAtom;
      brandCore: BrandCore;
      provider: "deterministic" | "openai";
      report: AtomValidationReport;
      recordRevision: number;
      trace: AtomBuildTrace;
      buildKey: string;
      reusedDraft: boolean;
    }
  | {
      ok: false;
      error: string;
      status: number;
      errors?: string[];
      report?: AtomValidationReport;
      trace?: AtomBuildTrace;
      code?: string;
    };

/**
 * Brain use case: Brand Core + selected handoff direction → Content Atom v2.
 * Owns buildKey idempotency + persist. Routes stay transport-only.
 */
export async function buildContentAtomFromHandoff(
  input: BuildContentAtomFromHandoffInput
): Promise<BuildContentAtomFromHandoffResult> {
  const domain = input.domain.trim();
  if (!domain) {
    return { ok: false, error: "domain is required", status: 400 };
  }

  const handoff = input.handoff;
  if (!handoff?.masterTopic || !handoff.variations?.length) {
    return {
      ok: false,
      error:
        "handoff with masterTopic and variations is required (save a selected direction first)",
      status: 400,
    };
  }

  const selectedId =
    input.selectedVariationId?.trim() || handoff.selectedVariationId;
  const variation = handoff.variations.find((v) => v.id === selectedId);
  if (!variation) {
    return {
      ok: false,
      error: `Unknown selectedVariationId: ${selectedId}`,
      status: 400,
    };
  }

  const loaded = await loadBrandContextForAtom({
    domain,
    fixturePath: input.fixturePath,
  });
  if (!loaded.ok) {
    return {
      ok: false,
      error: loaded.error,
      status: loaded.status,
    };
  }

  const parsedCat = parseTopicCategory(handoff.topicCategory);
  const topicCategory =
    parsedCat.ok && parsedCat.value ? parsedCat.value : undefined;
  pipelineTrace(
    "atom.envelope",
    {
      category: topicCategory ?? "MISSING",
      masterTitle: handoff.masterTopic.punchline,
      company: domain,
    },
    topicCategory ? "ok" : "warn"
  );

  const result = await runCoreContentBrain({
    context: loaded.context,
    preferLlm: PRODUCT_ATOM_PREFER_LLM,
    selected: {
      masterTopic: handoff.masterTopic,
      variation,
      generationId: handoff.generationId,
      topicCategory,
    },
  });

  if (!result.ok) {
    return {
      ok: false,
      error: "Content Atom validation failed",
      status: 422,
      errors: result.errors,
      report: result.report,
      trace: result.trace,
    };
  }

  const brandCore = result.brandCore;
  const brandIdentity = resolveBrandCoreIdentity(brandCore);
  const contract = buildSelectedDirectionContract({
    masterTopic: handoff.masterTopic,
    variation,
    topicCategory,
  });
  const preflight = runEvidenceSufficiencyPreflight({
    brandCore,
    contract,
  });
  const envelope = buildAtomEnvelope({
    brandCore,
    identity: brandIdentity,
    contract,
    preflight,
    generationId: handoff.generationId,
  });
  const buildKey = atomBuildKeyFromEnvelope(envelope, ATOM_PROMPT_VERSION);

  let recordRevision = 1;
  let atom = result.atom;
  let reusedDraft = false;

  if (input.persist !== false) {
    try {
      const repo = createAtomRepository();
      const existing = await repo.findUnlockedByBuildKey(buildKey, domain);
      if (existing) {
        atom = existing.atom;
        recordRevision = existing.record_revision;
        reusedDraft = true;
      } else {
        const stored = await repo.save(atom, {
          validationReport: result.report,
          buildKey,
        });
        recordRevision = stored.record_revision;
        atom = stored.atom;
      }
    } catch (err) {
      const { classifyPgError } = await import("@/db/pg-errors");
      const classified = classifyPgError(err);
      return {
        ok: false,
        error:
          "Content Atom built but could not be saved (atom store unavailable)",
        status: 500,
        report: result.report,
        trace: result.trace,
        code: classified.code,
      };
    }
  }

  return {
    ok: true,
    atom,
    brandCore,
    provider: result.provider,
    report: result.report,
    recordRevision,
    trace: result.trace,
    buildKey,
    reusedDraft,
  };
}
