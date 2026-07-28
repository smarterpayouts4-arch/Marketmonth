import { shortHash } from "@/brain/content/evidence";
import type { ContentVariation, MasterTopic } from "@/brain/content/types";
import type { BrandCore } from "@/brain/core/brand-core.schema";
import { resolveBrandCoreIdentity } from "@/brain/core/brand-core-identity";

import {
  computeMessageHash,
  type ContentAtom,
  type CreativeMode,
} from "./content-atom.schema";
import { validateAtomAgainstBrandCore } from "./validate-atom";

export type SelectedDirectionInput = {
  masterTopic: MasterTopic;
  variation: ContentVariation;
};

export type BuildContentAtomResult =
  | { ok: true; atom: ContentAtom }
  | { ok: false; errors: string[]; atom?: ContentAtom };

/**
 * Canonical Content Atom builder — channel-neutral strategic SSoT.
 * Automated validation marks ready | invalid (no human message gate).
 */
export function buildContentAtom(input: {
  brandCore: BrandCore;
  selected: SelectedDirectionInput;
}): BuildContentAtomResult {
  const draft = buildDeterministicDraft(input);
  return validateAtomAgainstBrandCore(draft, input.brandCore);
}

function buildDeterministicDraft(input: {
  brandCore: BrandCore;
  selected: SelectedDirectionInput;
}): ContentAtom {
  const { brandCore, selected } = input;
  const { masterTopic, variation } = selected;
  const identity = resolveBrandCoreIdentity(brandCore);
  const proof = brandCore.proof_library[0];
  const proof_id = proof?.proof_id ?? "proof_fallback";
  const claim_id = `claim_${shortHash(variation.id + variation.punchline)}`;
  const atom_id = `atom_${shortHash(`${identity.brand_core_hash}|${variation.id}`)}`;
  const measurement_id = `exp_${shortHash(atom_id).slice(0, 10)}`;

  const problem =
    variation.audienceProblem?.trim() ||
    `Feeling stuck choosing what to say about ${masterTopic.punchline}`;
  const specificTopic =
    variation.specificTopic?.trim() ||
    variation.punchline.trim() ||
    masterTopic.punchline;
  const claimWording = clamp(
    variation.punchline ||
      `${brandCore.brand_name} helps teams make clearer marketing decisions`,
    280
  );
  const openingIntent = clamp(
    `Open by challenging the assumption that more content volume fixes ${masterTopic.punchline.toLowerCase()}`,
    280
  );
  const planted = clamp(
    `What if ${masterTopic.punchline.toLowerCase()} does not require more content volume?`,
    200
  );
  const payoff = clamp(
    `A clear next decision for how to develop: ${variation.punchline}`,
    280
  );
  const intended =
    brandCore.cta_rules.preferred_actions[0] ?? "save";
  const belief = {
    from: "I need more disconnected content ideas",
    to: "One clear idea can power a coherent content system",
  };

  const partial = {
    master_topic: masterTopic.punchline,
    central_claim: {
      claim_id,
      meaning: clamp(variation.brief || claimWording, 280),
      canonical_wording: claimWording,
      claim_type: "opinion" as const,
    },
    supporting_proof: [
      {
        proof_id,
        meaning: clamp(proof?.summary || brandCore.positioning, 400),
        evidence_id: proof?.source_ref || proof_id,
      },
    ],
    desired_belief_shift: belief,
    promised_payoff: payoff,
    intended_action: intended,
    hook_strategy: {
      family: mapAngleToHookFamily(variation.angle),
      planted_question: planted,
      withheld_information: "The single editorial angle that organizes the month",
      resolution: clamp(variation.brief || variation.strategicPurpose, 280),
      opening_intent: openingIntent,
    },
  };

  const atom: ContentAtom = {
    atom_id,
    atom_version: 1,
    message_hash: computeMessageHash(partial),
    master_topic: masterTopic.punchline,
    selected_direction: {
      direction_id: variation.id,
      specific_topic: specificTopic,
      editorial_angle: variation.angle.replaceAll("_", " "),
      audience_problem: problem,
      core_promise: clamp(
        variation.corePromise ||
          variation.strategicPurpose ||
          variation.brief,
        280
      ),
      suggested_creative_mode:
        variation.suggestedFormat || mapAngleToCreativeMode(variation.angle),
    },
    audience: {
      state: problem,
      problem,
      core_tension: problem,
    },
    hook_strategy: partial.hook_strategy,
    central_claim: partial.central_claim,
    supporting_proof: partial.supporting_proof,
    desired_belief_shift: belief,
    narrative: {
      setup: clamp(masterTopic.punchline, 400),
      development: [
        clamp(variation.brief || variation.subheading, 400),
        clamp(variation.strategicPurpose, 400),
      ].filter(Boolean) as string[],
      payoff: clamp(
        variation.strategicPurpose ||
          "Leave with one direction worth developing first",
        400
      ),
    },
    promised_payoff: payoff,
    intended_action: intended,
    creative_mode: mapAngleToCreativeMode(variation.angle),
    visual_concept: clamp(
      `Visual metaphor for ${variation.angle.replaceAll("_", " ")} under "${masterTopic.punchline}"`,
      400
    ),
    safety: {
      banned_claims: [...brandCore.banned_claims],
      required_qualifiers: [],
      compliance_flags: [],
    },
    brand_core_id: identity.brand_core_id,
    brand_core_version: identity.brand_core_version,
    status: "validating",
    measurement_id,
  };

  if (atom.narrative.development.length === 0) {
    atom.narrative.development = [clamp(variation.subheading || specificTopic, 400)];
  }

  atom.message_hash = computeMessageHash(atom);
  return atom;
}

function mapAngleToHookFamily(
  angle: string
): ContentAtom["hook_strategy"]["family"] {
  if (angle === "comparison" || angle === "problem_solution") return "contrast";
  if (angle === "trust_transparency") return "belief_challenge";
  if (angle === "beginner_guide" || angle === "how_it_works") return "progression";
  return "curiosity_gap";
}

function mapAngleToCreativeMode(angle: string): CreativeMode {
  if (angle === "comparison") return "comparison";
  if (angle === "problem_solution") return "belief_challenge";
  if (angle === "how_it_works") return "demonstration";
  if (angle === "trust_transparency") return "case_study";
  return "educational_explanation";
}

function clamp(value: string, max: number): string {
  const t = value.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}
