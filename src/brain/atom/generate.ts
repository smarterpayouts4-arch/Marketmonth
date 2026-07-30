import { shortHash } from "@/brain/content/evidence";
import { wordSafeClamp as clamp } from "@/brain/lib/word-safe-clamp";
import { callBrainLlm } from "@/brain/llm/openai-client";
import { resolveModel } from "@/brain/policy/model-registry";
import { tokenBudget } from "@/brain/policy/token-budgets";

import type { AtomBuildEnvelope } from "./build-envelope";
import {
  ATOM_PROMPT_VERSION,
  computeMessageHash,
  type AtomClaim,
  type ContentAtom,
  type NarrativeModule,
} from "./content-atom.schema";

export type GeneratedSupportingClaim = {
  claimRuleId: string;
  expressedStatement: string;
  narrativeRole: string;
  claim_type: "observed" | "inferred" | "recommended";
};

export type GeneratedAtomFill = {
  audience_state: string;
  audience_problem: string;
  why_problem_exists: string;
  core_tension: string;
  central_claim: string;
  belief_shift: { from: string; to: string };
  resolution: string;
  payoff: string;
  supporting_claims: GeneratedSupportingClaim[];
  intended_action: string;
  planted_question: string;
  opening_intent: string;
  hook_resolution: string;
  key_question: string;
  supporting_points: Array<{
    point: string;
    explanation: string;
    evidence_id: string;
  }>;
  important_distinctions: Array<{ thisIs: string; thisIsNot: string }>;
  common_misunderstandings: Array<{
    misunderstanding: string;
    correction: string;
  }>;
  framework: string[];
  steps: string[];
  comparison_criteria: string[];
  objections: string[];
  narrative_spine: {
    triggerConcept: string;
    setup: string;
    problem: string;
    explanation: string;
    keyInsight: string;
    resolution: string;
    takeaway: string;
  };
  engagement_strategy: {
    internalAudienceTrigger: string;
    externalTriggerConcept: string;
    desiredConsumptionAction: string;
    actionFriction: string;
    contentPayoff: {
      expectedValue: string;
      insightValue: string;
      practicalValue: string;
      emotionalValue: string;
    };
    meaningfulAudienceInvestment: string;
    continuationTrigger: string;
    ethicalBoundaries: string[];
  };
  distribution: {
    requiredInvariants: string[];
    adaptableElements: string[];
    brandVoiceConstraints: string[];
    prohibitedInterpretations: string[];
    mustNotImply: string[];
    ctaIntent: string;
    ctaBoundaries: string[];
  };
  visual_concept: string;
  missing_information: string[];
  self_assessed_status: "complete" | "limited" | "insufficient";
};

const KERNEL_JSON_SCHEMA = {
  name: "content_atom_kernel_v3",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "audience_state",
      "audience_problem",
      "why_problem_exists",
      "core_tension",
      "central_claim",
      "belief_shift",
      "resolution",
      "payoff",
      "supporting_claims",
      "intended_action",
      "planted_question",
      "opening_intent",
      "hook_resolution",
      "key_question",
      "supporting_points",
      "important_distinctions",
      "common_misunderstandings",
      "framework",
      "steps",
      "comparison_criteria",
      "objections",
      "narrative_spine",
      "engagement_strategy",
      "distribution",
      "visual_concept",
      "missing_information",
      "self_assessed_status",
    ],
    properties: {
      audience_state: { type: "string" },
      audience_problem: { type: "string" },
      why_problem_exists: { type: "string" },
      core_tension: { type: "string" },
      central_claim: {
        type: "string",
        description:
          "Belief thesis the content argues — NOT an instruction, CTA, or next-step command",
      },
      belief_shift: {
        type: "object",
        additionalProperties: false,
        required: ["from", "to"],
        properties: {
          from: { type: "string" },
          to: { type: "string" },
        },
      },
      resolution: {
        type: "string",
        description: "How the tension resolves for the audience (not a CTA)",
      },
      payoff: {
        type: "string",
        description: "Value the audience leaves with after consuming the content",
      },
      supporting_claims: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "claimRuleId",
            "expressedStatement",
            "narrativeRole",
            "claim_type",
          ],
          properties: {
            claimRuleId: { type: "string" },
            expressedStatement: { type: "string" },
            narrativeRole: { type: "string" },
            claim_type: {
              type: "string",
              enum: ["observed", "inferred", "recommended"],
            },
          },
        },
      },
      intended_action: {
        type: "string",
        description:
          "Post-consumption audience action (what they do after reading) — separate from helper CTA intent",
      },
      planted_question: { type: "string" },
      opening_intent: { type: "string" },
      hook_resolution: { type: "string" },
      key_question: { type: "string" },
      supporting_points: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["point", "explanation", "evidence_id"],
          properties: {
            point: { type: "string" },
            explanation: { type: "string" },
            evidence_id: { type: "string" },
          },
        },
      },
      important_distinctions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["thisIs", "thisIsNot"],
          properties: {
            thisIs: { type: "string" },
            thisIsNot: { type: "string" },
          },
        },
      },
      common_misunderstandings: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["misunderstanding", "correction"],
          properties: {
            misunderstanding: { type: "string" },
            correction: { type: "string" },
          },
        },
      },
      framework: { type: "array", items: { type: "string" } },
      steps: { type: "array", items: { type: "string" } },
      comparison_criteria: { type: "array", items: { type: "string" } },
      objections: { type: "array", items: { type: "string" } },
      narrative_spine: {
        type: "object",
        additionalProperties: false,
        required: [
          "triggerConcept",
          "setup",
          "problem",
          "explanation",
          "keyInsight",
          "resolution",
          "takeaway",
        ],
        properties: {
          triggerConcept: { type: "string" },
          setup: { type: "string" },
          problem: { type: "string" },
          explanation: { type: "string" },
          keyInsight: { type: "string" },
          resolution: { type: "string" },
          takeaway: { type: "string" },
        },
      },
      engagement_strategy: {
        type: "object",
        additionalProperties: false,
        required: [
          "internalAudienceTrigger",
          "externalTriggerConcept",
          "desiredConsumptionAction",
          "actionFriction",
          "contentPayoff",
          "meaningfulAudienceInvestment",
          "continuationTrigger",
          "ethicalBoundaries",
        ],
        properties: {
          internalAudienceTrigger: { type: "string" },
          externalTriggerConcept: { type: "string" },
          desiredConsumptionAction: { type: "string" },
          actionFriction: { type: "string" },
          contentPayoff: {
            type: "object",
            additionalProperties: false,
            required: [
              "expectedValue",
              "insightValue",
              "practicalValue",
              "emotionalValue",
            ],
            properties: {
              expectedValue: { type: "string" },
              insightValue: { type: "string" },
              practicalValue: { type: "string" },
              emotionalValue: { type: "string" },
            },
          },
          meaningfulAudienceInvestment: { type: "string" },
          continuationTrigger: { type: "string" },
          ethicalBoundaries: { type: "array", items: { type: "string" } },
        },
      },
      distribution: {
        type: "object",
        additionalProperties: false,
        required: [
          "requiredInvariants",
          "adaptableElements",
          "brandVoiceConstraints",
          "prohibitedInterpretations",
          "mustNotImply",
          "ctaIntent",
          "ctaBoundaries",
        ],
        properties: {
          requiredInvariants: { type: "array", items: { type: "string" } },
          adaptableElements: { type: "array", items: { type: "string" } },
          brandVoiceConstraints: { type: "array", items: { type: "string" } },
          prohibitedInterpretations: {
            type: "array",
            items: { type: "string" },
          },
          mustNotImply: { type: "array", items: { type: "string" } },
          ctaIntent: { type: "string" },
          ctaBoundaries: { type: "array", items: { type: "string" } },
        },
      },
      visual_concept: { type: "string" },
      missing_information: { type: "array", items: { type: "string" } },
      self_assessed_status: {
        type: "string",
        enum: ["complete", "limited", "insufficient"],
      },
    },
  },
};

export const CONTENT_ATOM_GENERATE_SYSTEM = [
  "You are a strategic content architect operating in a CLOSED WORLD.",
  "You receive a brand envelope with evidence items and claim capability records (claimRuleId).",
  "Hard rules:",
  "1. Every supporting claim MUST return a claimRuleId that appears in claimCapabilities. Express the permitted meaning; do not invent evidence IDs. If nothing supports a claim, omit it. supporting_claims may be empty.",
  "2. Every supporting_points[].evidence_id MUST be an envelope evidence_id. Never use placeholders like MISSING_EVIDENCE.",
  "3. Never use banned claim phrases as assertions. Negation that dispels a banned claim is allowed.",
  "4. If evidence cannot support a deep atom, list gaps in missing_information and set self_assessed_status to limited or insufficient. Honest thin beats filler.",
  "5. Be specific to THIS brand, audience, and topic. Generic marketing prose is a failure.",
  "6. belief_shift.from and belief_shift.to must be substantively different and topic-specific.",
  "7. No platform formatting, durations, captions, or provider names.",
  "8. central_claim is the BELIEF thesis the content argues. It must NOT be phrased as an instruction, CTA, or 'do this next' command. Put post-consumption action in intended_action; helper CTA guidance belongs in distribution.ctaIntent.",
  "9. Prefer only as many supporting claims as the evidence distinctly supports; two strong claims beat four overlapping ones. Do not restate the same proof in different words.",
  "Targets (not mandates): aim ~650-750 words of structured content WHEN evidence supports depth; a climax insight is required; never pad.",
  "intended_action must be ONE complete sentence under 280 characters — never end mid-thought.",
  "Fill narrative modules, engagement strategy, and distribution contract with brand-specific substance. Distinctions and misunderstandings must be specific — empty arrays are better than generic filler.",
  "Respond with JSON matching the provided schema.",
].join("\n");

function categoryJobClause(topicCategory?: string): string {
  switch (topicCategory) {
    case "trust_proof":
      return "CATEGORY JOB (trust_proof): Show what proof exists, what creates confidence, what cannot be promised, and how a reader verifies — not a generic beginner checklist.";
    case "product_education":
      return "CATEGORY JOB (product_education): Teach a concrete first understanding; avoid hard-sell CTAs as the thesis.";
    case "customer_questions":
      return "CATEGORY JOB (customer_questions): Stay question-led; answer stalls honestly.";
    case "offers_conversion":
      return "CATEGORY JOB (offers_conversion): Clarify offer value and decision criteria without inventing guarantees.";
    default:
      return "";
  }
}

export type GenerateAtomResult =
  | { ok: true; fill: GeneratedAtomFill; provider: "openai"; model: string }
  | { ok: false; reason: string; provider: "none" };

/**
 * Constrained LLM fill bound to envelope claim capabilities / evidence IDs.
 */
export async function generateAtomFromEnvelope(input: {
  envelope: AtomBuildEnvelope;
  skeleton: ContentAtom;
  apiKey?: string;
  companyId?: string;
}): Promise<GenerateAtomResult> {
  const apiKey = input.apiKey ?? process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, reason: "OPENAI_API_KEY missing", provider: "none" };
  }

  if (
    input.envelope.preflight.status === "insufficient" ||
    input.envelope.preflight.status === "direction_conflict"
  ) {
    return {
      ok: false,
      reason: `preflight_${input.envelope.preflight.status}`,
      provider: "none",
    };
  }

  const model = resolveModel("contentAtomLlm");
  const job = categoryJobClause(input.envelope.topic.topicCategory);
  const userPayload = {
    brand: input.envelope.brand,
    banned_claims: input.envelope.banned_claims,
    brand_constraints: input.envelope.brandConstraints,
    build_policy_version: input.envelope.buildPolicyVersion,
    prompt_version: ATOM_PROMPT_VERSION,
    topic_category: input.envelope.topic.topicCategory ?? null,
    category_job: job || null,
    selected_topic: input.envelope.topic.masterTitle,
    selected_direction: {
      angle: input.envelope.direction.angle,
      requirements: input.envelope.direction.requirementsText,
      punchline: input.envelope.direction.punchline,
      brief: input.envelope.direction.brief,
      audience_problem: input.envelope.direction.audienceProblem,
      strategic_purpose: input.envelope.direction.strategicPurpose,
      audience_tension: input.envelope.direction.audienceTension,
      question_answered: input.envelope.direction.questionAnswered,
      thesis_hypothesis: input.envelope.direction.thesisHypothesis,
      intended_payoff: input.envelope.direction.intendedPayoff,
    },
    evidence: input.envelope.evidence,
    claimCapabilities: input.envelope.claimCapabilities,
    skeleton_claim_id: input.skeleton.kernel.central_claim.claim_id,
    cta_preferred: input.envelope.cta_preferred,
  };

  const system = job
    ? `${CONTENT_ATOM_GENERATE_SYSTEM}\n${job}`
    : CONTENT_ATOM_GENERATE_SYSTEM;

  const result = await callBrainLlm({
    apiKey,
    model,
    system,
    user: JSON.stringify(userPayload),
    jsonSchema: KERNEL_JSON_SCHEMA,
    maxOutputTokens: tokenBudget("atom"),
    timeoutMs: 90_000,
    maxRetries: 1,
    costScope: input.companyId
      ? { companyId: input.companyId }
      : { companyId: input.envelope.identity.company_id },
  });

  if (!result.ok || !result.raw) {
    return {
      ok: false,
      reason: result.ok ? "empty_response" : `${result.reason}: ${result.detail}`,
      provider: "none",
    };
  }

  try {
    const fill = JSON.parse(result.raw) as GeneratedAtomFill;
    if (!fill || typeof fill.central_claim !== "string") {
      return { ok: false, reason: "parse_shape", provider: "none" };
    }
    return { ok: true, fill, provider: "openai", model };
  } catch {
    return { ok: false, reason: "json_parse", provider: "none" };
  }
}

/** Merge constrained LLM fill into a skeleton atom (server recomputes hash). */
export function applyGeneratedFill(
  skeleton: ContentAtom,
  fill: GeneratedAtomFill,
  envelope: AtomBuildEnvelope
): ContentAtom {
  const evidenceIds = new Set(
    envelope.evidence.map((e) => e.evidence_id)
  );
  const capById = new Map(
    envelope.claimCapabilities.map((c) => [c.claimRuleId, c] as const)
  );

  const claims: AtomClaim[] = [];
  const seenStatements = new Set<string>();
  for (const c of fill.supporting_claims ?? []) {
    if (!c || typeof c.claimRuleId !== "string") continue;
    const cap = capById.get(c.claimRuleId);
    if (!cap) continue;
    const statement = clamp(c.expressedStatement || "", 400);
    if (!statement) continue;
    const norm = statement.toLowerCase().replace(/\s+/g, " ");
    if (seenStatements.has(norm)) continue;
    // Near-duplicate: share first 48 chars with an existing claim
    const prefix = norm.slice(0, 48);
    if ([...seenStatements].some((s) => s.startsWith(prefix) || prefix.startsWith(s.slice(0, 48)))) {
      continue;
    }
    // Jaccard token overlap with any kept claim
    const tokens = new Set(norm.split(/\s+/).filter((w) => w.length > 2));
    let jaccardDup = false;
    for (const prev of seenStatements) {
      const pt = new Set(prev.split(/\s+/).filter((w) => w.length > 2));
      let inter = 0;
      for (const t of tokens) if (pt.has(t)) inter += 1;
      const union = tokens.size + pt.size - inter;
      if (union > 0 && inter / union >= 0.72) {
        jaccardDup = true;
        break;
      }
    }
    if (jaccardDup) continue;
    seenStatements.add(norm);
    const ids = cap.evidenceIds.filter((id) => evidenceIds.has(id));
    if (ids.length === 0) continue;
    claims.push({
      claimId: `cl_${shortHash(`${c.claimRuleId}|${statement}`)}`,
      claimRuleId: c.claimRuleId,
      statement,
      classification: c.claim_type ?? "observed",
      evidenceIds: ids,
      qualificationRequired: Boolean(cap.requiredQualification),
      qualificationText: cap.requiredQualification,
      narrativeRole: clamp(c.narrativeRole || "support", 80),
    });
    if (claims.length >= 8) break;
  }

  const supporting_proof = claims.slice(0, 8).map((c) => ({
    proof_id: c.evidenceIds[0]!,
    meaning: clamp(c.statement, 400),
    evidence_id: c.evidenceIds[0]!,
  }));

  const proofs =
    supporting_proof.length > 0
      ? supporting_proof
      : skeleton.kernel.supporting_proof;

  const angle = skeleton.lineage.angle;
  const spine = fill.narrative_spine ?? {
    triggerConcept: "",
    setup: "",
    problem: "",
    explanation: "",
    keyInsight: "",
    resolution: "",
    takeaway: "",
  };

  const module: NarrativeModule = {
    keyQuestion: clamp(fill.key_question || "", 400),
    supportingPoints: (fill.supporting_points ?? [])
      .filter(
        (p) =>
          p &&
          typeof p.evidence_id === "string" &&
          evidenceIds.has(p.evidence_id)
      )
      .map((p) => ({
        point: clamp(p.point, 400),
        explanation: clamp(p.explanation, 800),
        evidence_id: p.evidence_id,
      }))
      .slice(0, 12),
    importantDistinctions: (fill.important_distinctions ?? [])
      .map((d) => ({
        thisIs: clamp(d.thisIs, 400),
        thisIsNot: clamp(d.thisIsNot, 400),
      }))
      .filter((d) => d.thisIs || d.thisIsNot)
      .slice(0, 8),
    commonMisunderstandings: (fill.common_misunderstandings ?? [])
      .map((m) => ({
        misunderstanding: clamp(m.misunderstanding, 400),
        correction: clamp(m.correction, 400),
      }))
      .filter((m) => m.misunderstanding || m.correction)
      .slice(0, 8),
    framework: (fill.framework ?? []).map((s) => clamp(s, 500)).filter(Boolean).slice(0, 12),
    steps: (fill.steps ?? []).map((s) => clamp(s, 500)).filter(Boolean).slice(0, 12),
    comparisonCriteria: (fill.comparison_criteria ?? [])
      .map((s) => clamp(s, 500))
      .filter(Boolean)
      .slice(0, 12),
    objections: (fill.objections ?? [])
      .map((s) => clamp(s, 400))
      .filter(Boolean)
      .slice(0, 12),
    canonicalNarrativeSpine: {
      triggerConcept: clamp(spine.triggerConcept, 400),
      setup: clamp(spine.setup || fill.audience_problem || "", 800),
      problem: clamp(spine.problem || fill.audience_problem || "", 800),
      explanation: clamp(spine.explanation || fill.why_problem_exists || "", 800),
      keyInsight: clamp(spine.keyInsight || fill.central_claim || "", 400),
      resolution: clamp(spine.resolution || fill.resolution || "", 800),
      takeaway: clamp(spine.takeaway || fill.payoff || "", 400),
    },
  };

  const es = fill.engagement_strategy;
  const dist = fill.distribution;

  const next: ContentAtom = {
    ...skeleton,
    lineage: {
      ...skeleton.lineage,
      promptVersion: ATOM_PROMPT_VERSION,
      createdBy: "model_assisted",
    },
    kernel: {
      ...skeleton.kernel,
      audience_state: clamp(
        fill.audience_state || skeleton.kernel.audience_state,
        400
      ),
      audience_problem: clamp(
        fill.audience_problem || skeleton.kernel.audience_problem,
        600
      ),
      why_problem_exists: clamp(fill.why_problem_exists || "", 800),
      core_tension: clamp(
        fill.core_tension || skeleton.kernel.core_tension,
        600
      ),
      central_claim: {
        ...skeleton.kernel.central_claim,
        meaning: clamp(
          fill.central_claim || skeleton.kernel.central_claim.meaning,
          400
        ),
        canonical_wording: clamp(
          fill.central_claim ||
            skeleton.kernel.central_claim.canonical_wording,
          400
        ),
        // Central claim is a belief thesis — default opinion unless skeleton already set.
        claim_type: skeleton.kernel.central_claim.claim_type || "opinion",
      },
      belief_shift: {
        from: clamp(
          fill.belief_shift?.from || skeleton.kernel.belief_shift.from,
          200
        ),
        to: clamp(
          fill.belief_shift?.to || skeleton.kernel.belief_shift.to,
          200
        ),
      },
      resolution: clamp(fill.resolution || skeleton.kernel.resolution, 400),
      payoff: clamp(fill.payoff || skeleton.kernel.payoff, 600),
      supporting_proof: proofs,
      intended_action: clamp(
        fill.intended_action || skeleton.kernel.intended_action,
        280
      ),
      hook_strategy: {
        ...skeleton.kernel.hook_strategy,
        planted_question: clamp(
          fill.planted_question ||
            skeleton.kernel.hook_strategy.planted_question,
          280
        ),
        opening_intent: clamp(
          fill.opening_intent || skeleton.kernel.hook_strategy.opening_intent,
          400
        ),
        resolution: clamp(
          fill.hook_resolution || skeleton.kernel.hook_strategy.resolution,
          400
        ),
      },
    },
    narrativeModules: {
      ...skeleton.narrativeModules,
      [angle]: module,
    },
    engagementBlueprint: {
      ...skeleton.engagementBlueprint,
      visual_concept: clamp(
        fill.visual_concept || skeleton.engagementBlueprint.visual_concept,
        400
      ),
      opening_device: clamp(
        fill.opening_intent ||
          skeleton.engagementBlueprint.opening_device ||
          "",
        280
      ),
      strategy: {
        internalAudienceTrigger: clamp(
          es?.internalAudienceTrigger ||
            skeleton.engagementBlueprint.strategy?.internalAudienceTrigger ||
            "",
          400
        ),
        externalTriggerConcept: clamp(
          es?.externalTriggerConcept ||
            skeleton.engagementBlueprint.strategy?.externalTriggerConcept ||
            "",
          400
        ),
        desiredConsumptionAction: clamp(
          es?.desiredConsumptionAction || "understand_then_decide",
          280
        ),
        actionFriction: clamp(es?.actionFriction || "", 280),
        contentPayoff: {
          expectedValue: clamp(
            es?.contentPayoff?.expectedValue || fill.payoff || "",
            400
          ),
          insightValue: clamp(es?.contentPayoff?.insightValue || "", 400) || undefined,
          practicalValue:
            clamp(es?.contentPayoff?.practicalValue || "", 400) || undefined,
          emotionalValue:
            clamp(es?.contentPayoff?.emotionalValue || "", 400) || undefined,
        },
        meaningfulAudienceInvestment:
          clamp(es?.meaningfulAudienceInvestment || "", 280) || undefined,
        continuationTrigger:
          clamp(es?.continuationTrigger || "", 280) || undefined,
        ethicalBoundaries: (es?.ethicalBoundaries ?? [])
          .map((b) => clamp(b, 280))
          .filter(Boolean)
          .slice(0, 12),
      },
    },
    claimLedger: {
      claims: claims.length > 0 ? claims : skeleton.claimLedger.claims,
      evidenceRefs: envelope.evidence.map((e) => e.evidence_id),
      missingInformation: uniqueStrings([
        ...skeleton.claimLedger.missingInformation,
        ...(fill.missing_information ?? []),
      ]),
      complianceNotes: skeleton.claimLedger.complianceNotes,
      forbiddenClaims: [...envelope.banned_claims],
      mustNotImply: uniqueStrings([
        ...skeleton.claimLedger.mustNotImply,
        ...(dist?.mustNotImply ?? []),
      ]),
    },
    distributionContract: {
      ...skeleton.distributionContract,
      requiredInvariants: (dist?.requiredInvariants?.length
        ? dist.requiredInvariants
        : skeleton.distributionContract.requiredInvariants
      )
        .map((s) => clamp(s, 400))
        .filter(Boolean)
        .slice(0, 16),
      adaptableElements: (dist?.adaptableElements?.length
        ? dist.adaptableElements
        : skeleton.distributionContract.adaptableElements
      )
        .map((s) => clamp(s, 400))
        .filter(Boolean)
        .slice(0, 16),
      brandVoiceConstraints: (dist?.brandVoiceConstraints?.length
        ? dist.brandVoiceConstraints
        : skeleton.distributionContract.brandVoiceConstraints
      )
        .map((s) => clamp(s, 280))
        .filter(Boolean)
        .slice(0, 12),
      prohibitedInterpretations: (dist?.prohibitedInterpretations?.length
        ? dist.prohibitedInterpretations
        : skeleton.distributionContract.prohibitedInterpretations
      )
        .map((s) => clamp(s, 400))
        .filter(Boolean)
        .slice(0, 16),
      mustNotImply: (dist?.mustNotImply?.length
        ? dist.mustNotImply
        : skeleton.distributionContract.mustNotImply
      )
        .map((s) => clamp(s, 400))
        .filter(Boolean)
        .slice(0, 16),
      ctaIntent: clamp(
        dist?.ctaIntent || skeleton.distributionContract.ctaIntent || "",
        280
      ),
      ctaBoundaries: (dist?.ctaBoundaries?.length
        ? dist.ctaBoundaries
        : skeleton.distributionContract.ctaBoundaries
      )
        .map((s) => clamp(s, 280))
        .filter(Boolean)
        .slice(0, 12),
    },
    missing_information: uniqueStrings([
      ...skeleton.missing_information,
      ...(fill.missing_information ?? []),
    ]),
    buildStatus: "draft",
  };

  next.message_hash = computeMessageHash(next);
  return next;
}

function uniqueStrings(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    const t = v.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}
