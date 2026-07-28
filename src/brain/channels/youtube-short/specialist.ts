import { shortHash } from "@/brain/content/evidence";
import type { ContentAtom } from "@/brain/atom";
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
 * YouTube Short specialist — platform-native package from a ready Content Atom.
 * Controlled interpretation: rewrite OK; strategy contradiction fail-closed.
 */
export function generateYouTubeShortPackage(input: {
  atom: ContentAtom;
}): YouTubeShortGenerateResult {
  const { atom } = input;
  if (atom.status !== "ready") {
    return {
      ok: false,
      errors: [`atom must be ready, got ${atom.status}`],
    };
  }

  const lock = buildStrategyLock(atom);
  const claimId = atom.central_claim.claim_id;
  const proofIds = atom.supporting_proof.map((p) => p.proof_id);
  const proofLine = atom.supporting_proof[0]?.meaning ?? atom.promised_payoff;

  const spoken_hook = clamp(
    atom.hook_strategy.opening_intent || atom.hook_strategy.planted_question,
    280
  );
  const title = clamp(atom.selected_direction.specific_topic, 100);

  const scenes = [
    {
      scene_id: "s1_hook",
      duration_seconds: 3,
      spoken_line: spoken_hook,
      on_screen_text: clamp(atom.hook_strategy.planted_question, 80),
      visual_prompt: clamp(
        `${atom.visual_concept}. First frame tension: ${atom.audience.core_tension}`,
        500
      ),
    },
    {
      scene_id: "s2_context",
      duration_seconds: 8,
      spoken_line: clamp(atom.narrative.setup, 400),
      on_screen_text: clamp(atom.audience.problem, 80),
      visual_prompt: clamp(
        `Context visual for: ${atom.audience.problem}`,
        500
      ),
    },
    {
      scene_id: "s3_claim",
      duration_seconds: 10,
      spoken_line: clamp(atom.central_claim.canonical_wording, 400),
      on_screen_text: clamp(atom.central_claim.meaning, 80),
      visual_prompt: clamp(
        `Support the claim visually without new promises: ${atom.central_claim.meaning}`,
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
      spoken_line: clamp(atom.promised_payoff, 400),
      on_screen_text: clamp(atom.intended_action, 40),
      visual_prompt: clamp(
        `Payoff visual ending on intended action: ${atom.intended_action}`,
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
      text: clamp(atom.hook_strategy.planted_question, 80),
      image_prompt: clamp(
        `${atom.visual_concept}. Bold first-frame text energy, 9:16`,
        500
      ),
    },
    scenes,
    voice_direction: {
      tone: "clear, confident, non-hype",
      pace: "brisk with a pause after the hook",
      emphasis: atom.central_claim.canonical_wording,
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
  const t = value.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}
