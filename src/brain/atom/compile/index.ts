import { shortHash } from "@/brain/content/evidence";
import { wordSafeClamp as clamp } from "@/brain/lib/word-safe-clamp";

import type { AtomBuildEnvelope } from "../build-envelope";
import {
  ATOM_POLICY_VERSION,
  ATOM_PROMPT_VERSION,
  CONTENT_ATOM_SCHEMA_VERSION,
  computeMessageHash,
  type ContentAtom,
  type CreativeMode,
  type ClaimLedger,
  type NarrativeModule,
} from "../content-atom.schema";

/**
 * Deterministic lineage + skeleton + claim-ledger seeds from envelope evidence.
 * Does not invent deep strategic prose; LLM fill happens in generate.ts.
 */
export function compileAtomSkeleton(envelope: AtomBuildEnvelope): ContentAtom {
  const { identity, direction, preflight, evidence } = envelope;
  const companyId = identity.company_id;
  const atom_id = `atom_${shortHash(
    `${companyId}|${identity.brand_core_hash}|${direction.directionId}`
  )}`;
  const claim_id = `claim_${shortHash(direction.directionId + direction.punchline)}`;
  const measurement_id = `exp_${shortHash(atom_id).slice(0, 10)}`;

  const problem =
    direction.audienceProblem?.trim() ||
    envelope.topic.audiencePain?.trim() ||
    direction.audienceTension ||
    `Unclear next step around ${direction.masterTitle}`;

  const thin =
    preflight.status === "insufficient" ||
    preflight.status === "direction_conflict" ||
    evidence.length === 0;

  const claims = evidence.slice(0, 6).map((e, i) => ({
    claimId: `cl_${shortHash(`${e.evidence_id}|${i}`)}`,
    claimRuleId: `rule_${e.evidence_id}`,
    statement: clamp(e.summary, 400),
    classification: "observed" as const,
    evidenceIds: [e.evidence_id],
    qualificationRequired: false,
    narrativeRole: "support",
  }));

  const claimLedger: ClaimLedger = {
    claims,
    evidenceRefs: evidence.map((e) => e.evidence_id),
    missingInformation: [...preflight.missingInformation],
    complianceNotes: [],
    forbiddenClaims: [...envelope.banned_claims],
    mustNotImply: [
      ...envelope.banned_claims,
      "outcomes are guaranteed",
      "this content diagnoses or treats medical conditions",
    ],
  };

  const supporting_proof = evidence.slice(0, 3).map((e) => ({
    proof_id: e.evidence_id,
    meaning: clamp(e.summary, 400),
    evidence_id: e.evidence_id,
  }));

  const belief_shift = thin
    ? {
        from: "Evidence is too thin to name a specific audience belief yet",
        to: "Gather grounded proof before locking a belief shift",
      }
    : {
        from: clamp(
          `I am stuck on ${problem.toLowerCase()} without a clear frame`,
          200
        ),
        to: clamp(
          direction.corePromise ||
            direction.strategicPurpose ||
            `There is a clearer path on ${direction.masterTitle}`,
          200
        ),
      };

  const centralWording = thin
    ? clamp(
        `Insufficient evidence to assert a central claim for ${direction.masterTitle}`,
        280
      )
    : clamp(direction.punchline || direction.brief, 280);

  const payoff = thin
    ? "No payoff asserted until evidence is sufficient"
    : clamp(
        direction.intendedPayoff ||
          direction.corePromise ||
          `A clearer next decision on ${direction.masterTitle}`,
        600
      );

  // Post-consumption audience action (kernel) vs helper CTA intent (distribution).
  const intendedAction = thin
    ? "gather_more_evidence"
    : clamp(
        direction.strategicPurpose
          ? `act_on_${direction.angle}`
          : "understand_then_decide",
        280
      );
  const ctaIntent = envelope.cta_preferred[0]?.trim() || "learn_more";

  const hook_strategy = {
    family: mapAngleToHookFamily(direction.angle),
    planted_question: clamp(
      thin
        ? `What evidence would unlock a specific claim about ${direction.masterTitle}?`
        : `What if ${problem.toLowerCase()} has a clearer cause than it seems?`,
      280
    ),
    withheld_information: thin
      ? "Missing Brand Core evidence for a locked claim"
      : clamp(direction.strategicPurpose, 200),
    resolution: clamp(
      thin
        ? "Stop at honest insufficient status rather than filler"
        : direction.brief || direction.strategicPurpose,
      400
    ),
    opening_intent: clamp(
      thin
        ? `Open by acknowledging the evidence gap on ${direction.masterTitle}`
        : `Open by naming the tension behind ${problem.toLowerCase()}`,
      400
    ),
  };

  const spine = {
    triggerConcept: thin ? "" : clamp(direction.questionAnswered || problem, 400),
    setup: clamp(direction.masterTitle, 800),
    problem: thin ? "" : clamp(problem, 800),
    explanation: thin ? "" : clamp(direction.brief || "", 800),
    keyInsight: thin ? "" : clamp(direction.thesisHypothesis || direction.punchline, 400),
    resolution: thin
      ? ""
      : clamp(direction.strategicPurpose || direction.brief, 800),
    takeaway: thin ? "" : clamp(payoff, 400),
  };

  const module: NarrativeModule = {
    keyQuestion: clamp(direction.questionAnswered || "", 400),
    supportingPoints: evidence.slice(0, 4).map((e) => ({
      point: clamp(e.summary, 400),
      explanation: thin ? "" : clamp(e.summary, 800),
      evidence_id: e.evidence_id,
    })),
    importantDistinctions: thin
      ? []
      : [
          {
            thisIs: clamp(
              `A strategic explanation of ${direction.masterTitle}`,
              400
            ),
            thisIsNot: "A platform-ready caption or promotional pitch",
          },
        ],
    commonMisunderstandings: [],
    framework: [],
    steps: [],
    comparisonCriteria: [],
    objections: [],
    canonicalNarrativeSpine: spine,
  };

  const narrativeModules: ContentAtom["narrativeModules"] = {
    [direction.angle]: module,
  };

  const lineage = {
    companyId,
    generationId: envelope.generationId,
    selectedDirectionId: direction.directionId,
    brandCoreId: identity.brand_core_id,
    brandCoreHash: identity.brand_core_hash,
    brandCoreVersion: identity.brand_core_version,
    topicId: direction.topicId ?? envelope.topic.topicId,
    masterTitle: direction.masterTitle,
    angle: direction.angle,
    specificTopic: direction.specificTopic,
    editorialAngle: direction.angle.replaceAll("_", " "),
    corePromise: direction.corePromise,
    atomPolicyVersion: ATOM_POLICY_VERSION,
    promptVersion: ATOM_PROMPT_VERSION,
    evidenceAdmissionPolicyVersion: envelope.evidenceAdmissionPolicyVersion,
    createdAt: new Date().toISOString(),
    createdBy: "deterministic" as const,
  };

  const kernel = {
    audience_state: clamp(
      envelope.topic.audience || envelope.brand.audience_primary || problem,
      400
    ),
    audience_problem: clamp(problem, 600),
    why_problem_exists: thin ? "" : clamp(direction.brief || "", 800),
    core_tension: clamp(problem, 600),
    central_claim: {
      claim_id,
      meaning: clamp(direction.brief || centralWording, 280),
      canonical_wording: centralWording,
      claim_type: thin ? ("inferred" as const) : ("opinion" as const),
    },
    belief_shift,
    resolution: thin
      ? ""
      : clamp(direction.strategicPurpose || direction.brief, 400),
    payoff,
    supporting_proof,
    intended_action: intendedAction,
    hook_strategy,
  };

  const draft: ContentAtom = {
    schemaVersion: CONTENT_ATOM_SCHEMA_VERSION,
    atom_id,
    atom_version: 1,
    message_hash: "",
    lineage,
    kernel,
    narrativeModules,
    engagementBlueprint: {
      creative_mode: mapAngleToCreativeMode(direction.angle),
      visual_concept: clamp(
        thin
          ? `Placeholder visual — insufficient evidence for ${direction.masterTitle}`
          : `Visual metaphor for ${direction.angle.replaceAll("_", " ")} under "${direction.masterTitle}"`,
        400
      ),
      opening_device: hook_strategy.opening_intent,
      strategy: {
        internalAudienceTrigger: clamp(problem, 400),
        externalTriggerConcept: clamp(
          direction.questionAnswered || direction.masterTitle,
          400
        ),
        desiredConsumptionAction: clamp(
          thin
            ? "understand_evidence_gap"
            : direction.intendedPayoff || "understand_then_decide",
          200
        ),
        actionFriction: thin
          ? ""
          : clamp(
              direction.audienceTension ||
                `Unclear next step on ${direction.masterTitle}`,
              280
            ),
        contentPayoff: {
          expectedValue: clamp(payoff, 400),
          insightValue: thin
            ? ""
            : clamp(direction.thesisHypothesis || "", 400),
          practicalValue: thin
            ? ""
            : clamp(direction.strategicPurpose || "", 400),
        },
        ethicalBoundaries: [
          "Do not invent evidence",
          "Do not imply guaranteed outcomes",
          ...envelope.banned_claims.slice(0, 4),
        ],
      },
    },
    claimLedger,
    distributionContract: {
      intended_channels: [],
      channel_neutrality: true,
      notes: "Channel-neutral atom — specialists adapt after approval/lock",
      requiredInvariants: [
        "Stay within envelope evidence",
        "Preserve belief shift meaning",
        "Remain channel-neutral",
        ...(envelope.topic.topicCategory
          ? [`Honor topic category job: ${envelope.topic.topicCategory}`]
          : []),
        `Brand: ${envelope.brand.name}`,
      ],
      adaptableElements: [
        "visual presentation hints",
        "spoken length",
        "channel CTA wording within ctaBoundaries",
        clamp(direction.suggestedFormat || "format pacing", 80),
      ],
      brandVoiceConstraints: [clamp(envelope.brand.voice || "clear and direct", 280)],
      prohibitedInterpretations: [...envelope.banned_claims.slice(0, 8)],
      mustNotImply: [
        "guaranteed results",
        "medical diagnosis or cure",
        ...envelope.banned_claims.slice(0, 4),
      ],
      ctaIntent,
      ctaBoundaries: [
        "No hard sell beyond preferred CTAs",
        `Promotion level: ${envelope.brandConstraints.promotionLevel}`,
        ...(envelope.cta_preferred.length
          ? [`Prefer CTAs: ${envelope.cta_preferred.slice(0, 3).join(", ")}`]
          : []),
      ],
    },
    buildStatus: "draft",
    approvalStatus: "unreviewed",
    safety: {
      banned_claims: [...envelope.banned_claims],
      required_qualifiers: [],
      compliance_flags:
        preflight.status === "direction_conflict"
          ? ["direction_conflict"]
          : [],
      allowed_evidence_ids: [...preflight.usableEvidenceIds],
    },
    missing_information: [...preflight.missingInformation],
    measurement_id,
  };

  draft.message_hash = computeMessageHash(draft);
  return draft;
}

function mapAngleToHookFamily(
  angle: string
): ContentAtom["kernel"]["hook_strategy"]["family"] {
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
