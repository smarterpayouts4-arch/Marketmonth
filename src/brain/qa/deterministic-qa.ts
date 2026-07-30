import {
  isAtomSpecialistReady,
  type ContentAtom,
} from "@/brain/atom";
import type { YouTubeShortPackage } from "@/brain/channels/youtube-short";
import type { BrandCore } from "@/brain/core/brand-core.schema";
import { assertStrategyLock } from "@/brain/strategy-lock";
import type { ImageProviderConfig } from "@/brain/render/types";

export type QaCheck = {
  id: string;
  pass: boolean;
  detail: string;
};

export type DeterministicQaResult = {
  ok: boolean;
  checks: QaCheck[];
};

/**
 * Deterministic quality checks — not an AI critic brain.
 */
export function runDeterministicQa(input: {
  atom: ContentAtom;
  brandCore: BrandCore;
  youtubeShortPackage?: YouTubeShortPackage;
  imageConfig?: ImageProviderConfig;
}): DeterministicQaResult {
  const checks: QaCheck[] = [];

  checks.push({
    id: "atom_schema_fields",
    pass: Boolean(
      input.atom.kernel.hook_strategy?.planted_question &&
        input.atom.kernel.hook_strategy?.opening_intent &&
        input.atom.kernel.payoff &&
        input.atom.kernel.central_claim?.claim_id &&
        isAtomSpecialistReady(input.atom)
    ),
    detail:
      "Atom specialist-ready with hook_strategy, payoff, and central_claim",
  });

  checks.push({
    id: "supporting_proof_present",
    pass: input.atom.kernel.supporting_proof.length > 0,
    detail: "At least one supporting_proof present",
  });

  const claimBlob = [
    input.atom.kernel.central_claim.canonical_wording,
    input.atom.kernel.central_claim.meaning,
    input.atom.kernel.payoff,
  ]
    .join(" ")
    .toLowerCase();
  const bannedHit = input.brandCore.banned_claims.find((b) =>
    claimBlob.includes(b.toLowerCase())
  );
  checks.push({
    id: "banned_claims",
    pass: !bannedHit,
    detail: bannedHit
      ? `Banned claim language: ${bannedHit}`
      : "No banned claim language in atom claims",
  });

  if (input.youtubeShortPackage) {
    const lock = assertStrategyLock(
      input.atom,
      input.youtubeShortPackage.strategy_lock,
      {
        claim_ids: input.youtubeShortPackage.claim_ids_used,
        proof_ids: input.youtubeShortPackage.proof_ids_used,
      }
    );
    checks.push({
      id: "strategy_lock",
      pass: lock.ok,
      detail: lock.ok
        ? "YouTube Short strategy_lock matches atom"
        : lock.violations.join("; "),
    });

    const sum = input.youtubeShortPackage.scenes.reduce(
      (a, s) => a + s.duration_seconds,
      0
    );
    checks.push({
      id: "scene_duration_sum",
      pass: sum <= 60,
      detail: `Scene durations sum to ${sum}s (max 60)`,
    });
  }

  if (input.imageConfig) {
    checks.push({
      id: "image_provider_config",
      pass: Boolean(
        input.imageConfig.image_provider && input.imageConfig.image_model
      ),
      detail: `image_provider=${input.imageConfig.image_provider} image_model=${input.imageConfig.image_model}`,
    });
  }

  return {
    ok: checks.every((c) => c.pass),
    checks,
  };
}
