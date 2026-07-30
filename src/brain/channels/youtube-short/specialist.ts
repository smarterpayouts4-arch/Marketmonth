import { shortHash } from "@/brain/content/evidence";
import {
  isAtomSpecialistReady,
  type ContentAtom,
} from "@/brain/atom";
import { wordSafeClamp } from "@/brain/lib/word-safe-clamp";
import {
  assertStrategyLock,
  buildStrategyLock,
} from "@/brain/strategy-lock";

import { computeYouTubeShortPackageHash } from "./hash-package";
import {
  youtubeShortPackageSchema,
  type YouTubeShortPackage,
} from "./package.schema";
import { validateYouTubeShortPackage } from "./validate-package";

export type YouTubeShortGenerateResult =
  | { ok: true; package: YouTubeShortPackage }
  | { ok: false; errors: string[] };

/**
 * YouTube Short specialist — platform-native package from a specialist-ready atom.
 * Controlled interpretation: rewrite OK; strategy contradiction fail-closed.
 */
export function generateYouTubeShortPackage(input: {
  atom: ContentAtom;
}): YouTubeShortGenerateResult {
  const { atom } = input;
  if (!isAtomSpecialistReady(atom)) {
    return {
      ok: false,
      errors: [
        `atom must be specialist-ready, got buildStatus=${atom.buildStatus} approvalStatus=${atom.approvalStatus}`,
      ],
    };
  }

  const lock = buildStrategyLock(atom);
  const claimId = atom.kernel.central_claim.claim_id;
  const proofIds = atom.kernel.supporting_proof.map((p) => p.proof_id);
  const proofLine =
    atom.kernel.supporting_proof[0]?.meaning ?? atom.kernel.payoff;

  const spoken_hook = clamp(
    atom.kernel.hook_strategy.opening_intent ||
      atom.kernel.hook_strategy.planted_question,
    280
  );
  const title = clamp(
    atom.lineage.specificTopic || atom.lineage.masterTitle,
    100
  );

  const narrative = atom.narrativeModules[atom.lineage.angle];
  const spokenSetup =
    narrative?.canonicalNarrativeSpine?.setup ||
    atom.kernel.audience_problem;

  const scenes = [
    {
      scene_id: "s1_hook",
      duration_seconds: 3,
      spoken_line: spoken_hook,
      on_screen_text: clamp(atom.kernel.hook_strategy.planted_question, 80),
      visual_prompt: clamp(
        `${atom.engagementBlueprint.visual_concept}. First frame tension: ${atom.kernel.core_tension}`,
        500
      ),
    },
    {
      scene_id: "s2_context",
      duration_seconds: 8,
      spoken_line: clamp(spokenSetup, 400),
      on_screen_text: clamp(atom.kernel.audience_problem, 80),
      visual_prompt: clamp(
        `Context visual for: ${atom.kernel.audience_problem}`,
        500
      ),
    },
    {
      scene_id: "s3_claim",
      duration_seconds: 10,
      spoken_line: clamp(atom.kernel.central_claim.canonical_wording, 400),
      on_screen_text: clamp(atom.kernel.central_claim.meaning, 80),
      visual_prompt: clamp(
        `Support the claim visually without new promises: ${atom.kernel.central_claim.meaning}`,
        500
      ),
    },
    {
      scene_id: "s4_proof",
      duration_seconds: 10,
      spoken_line: clamp(proofLine, 400),
      on_screen_text: "Proof",
      visual_prompt: clamp(`Evidence-forward visual: ${proofLine}`, 500),
    },
    {
      scene_id: "s5_payoff",
      duration_seconds: 8,
      spoken_line: clamp(atom.kernel.payoff, 400),
      on_screen_text: clamp(atom.kernel.intended_action, 40),
      visual_prompt: clamp(
        `Payoff visual ending on intended action: ${atom.kernel.intended_action}`,
        500
      ),
    },
  ];

  const total = scenes.reduce((s, sc) => s + sc.duration_seconds, 0);
  const script = scenes.map((s) => s.spoken_line).join("\n\n");

  const withoutHash = {
    package_id: `pkg_yt_short_${shortHash(atom.atom_id + atom.atom_version)}`,
    package_version: 1,
    package_hash: "",
    channel: "youtube-short" as const,
    source_atom_id: atom.atom_id,
    source_atom_version: atom.atom_version,
    strategy_lock: lock,
    status: "draft" as const,
    created_at: new Date().toISOString(),
    title,
    spoken_hook,
    script,
    retention_plan: {
      opening_seconds: 3,
      pattern_interrupts: [
        "Cut to on-screen question",
        "Proof card punch-in",
      ],
      payoff_timestamp: Math.max(total - 8, 12),
    },
    thumbnail_or_first_frame: {
      text: clamp(atom.kernel.hook_strategy.planted_question, 80),
      image_prompt: clamp(
        `${atom.engagementBlueprint.visual_concept}. Bold first-frame text energy, 9:16`,
        500
      ),
    },
    scenes,
    voice_direction: {
      tone: "clear, confident, non-hype",
      pace: "brisk with a pause after the hook",
      emphasis: atom.kernel.central_claim.canonical_wording,
    },
    render_plan: {
      image_provider: "stub-image",
      voice_provider: "stub-voice",
      video_compiler: "json2video-stub",
      aspect_ratio: "9:16" as const,
      target_duration_seconds: total,
    },
    claim_ids_used: [claimId],
    proof_ids_used: proofIds,
  };

  const package_hash = computeYouTubeShortPackageHash(withoutHash);
  const pkg = { ...withoutHash, package_hash, status: "validated" as const };

  const lockCheck = assertStrategyLock(atom, pkg.strategy_lock, {
    claim_ids: pkg.claim_ids_used,
    proof_ids: pkg.proof_ids_used,
  });
  if (!lockCheck.ok) {
    return { ok: false, errors: lockCheck.violations };
  }

  const parsed = youtubeShortPackageSchema.safeParse(pkg);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map(
        (i) => `${i.path.join(".")}: ${i.message}`
      ),
    };
  }

  const validated = validateYouTubeShortPackage(atom, parsed.data);
  if (!validated.ok) return validated;

  return { ok: true, package: parsed.data };
}

function clamp(value: string, max: number): string {
  return wordSafeClamp(value, max);
}
