import type { AtomBuildEnvelope } from "../build-envelope";
import { brandInHookFields } from "../brand-placement";
import { buildAtomCraftReport } from "../craft-score";
import {
  computeMessageHash,
  contentAtomSchema,
  type BuildStatus,
  type ContentAtom,
} from "../content-atom.schema";
import { frameworkPromiseUnfulfilled } from "../framework-promise";
import { buildSpecialtyResearchHandoff } from "../research-handoff";

import {
  collectAssertedText,
  findAssertedBannedClaims,
  findClaimLikeFraming,
} from "./banned-claims";
import { validateClosedWorld } from "./closed-world";
import type {
  AtomValidationReport,
  AtomValidationViolation,
  GateResult,
} from "./types";

export type {
  AtomValidationReport,
  AtomValidationViolation,
  AtomStatusReason,
  GateResult,
} from "./types";
export { validateClosedWorld } from "./closed-world";
export {
  collectAssertedText,
  findAssertedBannedClaims,
  findClaimLikeFraming,
} from "./banned-claims";

const TEMPLATE_ECHOES = [
  "i need more disconnected content ideas",
  "one clear idea can power a coherent content system",
];

// Avoid bare "short" — it false-positives on ordinary English ("a short proof").
const PLATFORM_WORDS =
  /\b(youtube|tiktok|instagram|youtube\s*shorts?|tiktoks?|reels?|caption|hashtag|#\w+|seconds?\s+long|\d{1,3}\s*sec(?:ond)?s?\b)\b/i;

const REPAIRABLE = new Set([
  "claimLedger",
  "kernel.supporting_proof",
  "missing_information",
  "kernel.belief_shift.from",
  "kernel.belief_shift.to",
]);

function gate(
  gateId: string,
  outcome: GateResult["outcome"],
  message: string,
  severity: GateResult["severity"] = "info",
  path?: string
): GateResult {
  return { gateId, outcome, message, severity, path };
}

/**
 * Texts the brand asserts. Misunderstanding labels (wrong beliefs being
 * corrected) are exempt — same spirit as belief_shift.from.
 * Ethical boundary lists name bans intentionally and are also exempt.
 */
function narrativeAssertedTexts(atom: ContentAtom): string[] {
  const mod = atom.narrativeModules[atom.lineage.angle];
  if (!mod) return [];
  const spine = mod.canonicalNarrativeSpine;
  return [
    mod.keyQuestion,
    ...mod.supportingPoints.flatMap((p) => [p.point, p.explanation]),
    ...mod.importantDistinctions.flatMap((d) => [d.thisIs, d.thisIsNot]),
    // Only the correction is asserted; the misconception may quote bans.
    ...mod.commonMisunderstandings.map((m) => m.correction),
    ...mod.framework,
    ...mod.steps,
    ...mod.comparisonCriteria,
    ...mod.objections,
    spine.triggerConcept,
    spine.setup,
    spine.problem,
    spine.explanation,
    spine.keyInsight,
    spine.resolution,
    spine.takeaway,
  ];
}

function engagementAssertedTexts(atom: ContentAtom): string[] {
  const s = atom.engagementBlueprint.strategy;
  if (!s) return [];
  return [
    s.internalAudienceTrigger,
    s.externalTriggerConcept,
    s.desiredConsumptionAction,
    s.actionFriction,
    s.contentPayoff.expectedValue,
    s.contentPayoff.insightValue ?? "",
    s.contentPayoff.practicalValue ?? "",
    s.contentPayoff.emotionalValue ?? "",
    s.meaningfulAudienceInvestment ?? "",
    s.continuationTrigger ?? "",
    // ethicalBoundaries intentionally name banned phrases — do not scan.
  ];
}

/**
 * Closed-world atom validation pipeline.
 * Application-owned status: selfAssessed may only demote.
 * Must not import from src/brain/evaluation/ (cycle risk via barrel).
 */
export function runAtomValidationPipeline(input: {
  atom: ContentAtom;
  envelope: AtomBuildEnvelope;
  selfAssessed?: "complete" | "limited" | "insufficient";
}): AtomValidationReport {
  const parsed = contentAtomSchema.safeParse(input.atom);
  const violations: AtomValidationViolation[] = [];
  const gateResults: GateResult[] = [];

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      violations.push({
        code: "schema",
        path: issue.path.join(".") || "atom",
        message: issue.message,
        severity: "error",
      });
    }
    gateResults.push(
      gate("schema", "fail", "atom failed schema validation", "error")
    );
    return finalizeReport({
      atom: { ...input.atom, buildStatus: "invalid" },
      buildStatus: "invalid",
      violations,
      gateResults,
    });
  }

  let atom = parsed.data;
  const expectedHash = computeMessageHash(atom);
  if (atom.message_hash !== expectedHash) {
    atom = { ...atom, message_hash: expectedHash };
  }

  // Identity / tenant
  if (!atom.lineage.companyId?.trim()) {
    violations.push({
      code: "identity_company_missing",
      path: "lineage.companyId",
      message: "companyId missing on atom lineage",
      severity: "error",
    });
    gateResults.push(gate("identity_tenant", "fail", "company missing", "error"));
  } else if (
    atom.lineage.companyId !== input.envelope.identity.company_id
  ) {
    violations.push({
      code: "identity_company_mismatch",
      path: "lineage.companyId",
      message: "atom companyId does not match envelope identity",
      severity: "error",
    });
    gateResults.push(
      gate("identity_tenant", "fail", "cross-tenant company mismatch", "error")
    );
  } else {
    gateResults.push(gate("identity_tenant", "pass", "company identity ok"));
  }

  if (
    input.envelope.preflight.status === "insufficient" ||
    input.envelope.preflight.status === "direction_conflict"
  ) {
    const status =
      input.envelope.preflight.status === "direction_conflict"
        ? ("invalid" as const)
        : ("insufficient" as const);
    if (status === "invalid") {
      violations.push({
        code: "direction_conflict",
        path: "preflight",
        message: "direction evidence conflicts with Brand Core",
        severity: "error",
      });
    }
    gateResults.push(
      gate(
        "preflight",
        status === "invalid" ? "fail" : "warn",
        `preflight ${input.envelope.preflight.status}`,
        status === "invalid" ? "error" : "warning"
      )
    );
    return finalizeReport({
      atom: {
        ...atom,
        buildStatus: status,
        missing_information: unique([
          ...atom.missing_information,
          ...input.envelope.preflight.missingInformation,
        ]),
      },
      buildStatus: status,
      violations,
      gateResults,
    });
  }
  gateResults.push(gate("preflight", "pass", `preflight ${input.envelope.preflight.status}`));

  violations.push(...validateClosedWorld(atom, input.envelope));
  gateResults.push(
    gate(
      "closed_world",
      violations.some((v) => v.code === "fabricated_citation")
        ? "fail"
        : "pass",
      "closed-world citation check",
      violations.some((v) => v.code === "fabricated_citation")
        ? "error"
        : "info"
    )
  );

  const mod = atom.narrativeModules[atom.lineage.angle];
  const framingTargets: Array<{ path: string; text: string }> = [];
  if (mod) {
    for (const [i, d] of mod.importantDistinctions.entries()) {
      framingTargets.push({
        path: `narrativeModules.${atom.lineage.angle}.importantDistinctions[${i}]`,
        text: `${d.thisIs} ${d.thisIsNot}`,
      });
    }
    for (const [i, m] of mod.commonMisunderstandings.entries()) {
      // Scan correction only — misunderstanding may quote the false claim.
      framingTargets.push({
        path: `narrativeModules.${atom.lineage.angle}.commonMisunderstandings[${i}].correction`,
        text: m.correction,
      });
    }
    const spine = mod.canonicalNarrativeSpine;
    framingTargets.push(
      { path: "canonicalNarrativeSpine.setup", text: spine.setup },
      { path: "canonicalNarrativeSpine.explanation", text: spine.explanation },
      { path: "canonicalNarrativeSpine.keyInsight", text: spine.keyInsight }
    );
  }
  const strat = atom.engagementBlueprint.strategy;
  if (strat) {
    framingTargets.push(
      {
        path: "engagementBlueprint.strategy.internalAudienceTrigger",
        text: strat.internalAudienceTrigger,
      },
      {
        path: "engagementBlueprint.strategy.contentPayoff",
        text: strat.contentPayoff.expectedValue,
      }
    );
  }
  // Boundary lists (prohibitedInterpretations / mustNotImply) intentionally
  // name banned phrases — do not treat them as asserted framing.
  if (atom.distributionContract.ctaIntent) {
    framingTargets.push({
      path: "distributionContract.ctaIntent",
      text: atom.distributionContract.ctaIntent,
    });
  }

  const framingHits = findClaimLikeFraming(framingTargets);
  for (const hit of framingHits) {
    violations.push({
      code: "claim_like_framing",
      path: hit.path,
      message: `claim-like framing without evidence citation: ${hit.snippet}`,
      severity: "warning",
    });
  }
  gateResults.push(
    gate(
      "claim_like_framing",
      framingHits.length ? "warn" : "pass",
      framingHits.length
        ? `${framingHits.length} claim-like framing hit(s)`
        : "no claim-like framing detected",
      framingHits.length ? "warning" : "info"
    )
  );

  // Do NOT scan mustNotImply / forbiddenClaims / prohibitedInterpretations —
  // those lists intentionally name banned phrases as boundaries, not assertions.
  const asserted = collectAssertedText({
    audience_state: atom.kernel.audience_state,
    audience_problem: atom.kernel.audience_problem,
    why_problem_exists: atom.kernel.why_problem_exists,
    core_tension: atom.kernel.core_tension,
    central_claim: atom.kernel.central_claim.canonical_wording,
    belief_shift_to: atom.kernel.belief_shift.to,
    resolution: atom.kernel.resolution,
    payoff: atom.kernel.payoff,
    claimTexts: atom.claimLedger.claims.map((c) => c.statement),
    extraTexts: [
      ...narrativeAssertedTexts(atom),
      ...engagementAssertedTexts(atom),
    ],
  });

  const bannedHits = findAssertedBannedClaims(
    asserted,
    atom.safety.banned_claims
  );
  for (const banned of bannedHits) {
    violations.push({
      code: "banned_claim_asserted",
      path: "kernel",
      message: `banned claim asserted: ${banned}`,
      severity: "error",
    });
  }
  gateResults.push(
    gate(
      "banned_claims",
      bannedHits.length ? "fail" : "pass",
      bannedHits.length ? "banned claim asserted" : "banned claims clear",
      bannedHits.length ? "error" : "info"
    )
  );

  const fullText = `${asserted} \n ${atom.kernel.belief_shift.from.toLowerCase()}`;
  for (const echo of TEMPLATE_ECHOES) {
    if (fullText.includes(echo)) {
      violations.push({
        code: "template_echo",
        path: "kernel.belief_shift",
        message: `hollow v1 template echo detected: ${echo}`,
        severity: "error",
      });
    }
  }

  // Near-duplicate claims
  const statements = atom.claimLedger.claims.map((c) =>
    c.statement.toLowerCase().replace(/\s+/g, " ").trim()
  );
  for (let i = 0; i < statements.length; i++) {
    for (let j = i + 1; j < statements.length; j++) {
      const a = statements[i]!;
      const b = statements[j]!;
      if (a.slice(0, 48) === b.slice(0, 48) || a === b) {
        violations.push({
          code: "duplicate_claim",
          path: `claimLedger.claims[${j}]`,
          message: "near-duplicate claim rejected (anti-padding)",
          severity: "warning",
        });
      }
    }
  }

  // Topic fidelity
  const topicTitle = input.envelope.topic.masterTitle.toLowerCase();
  const atomTitle = atom.lineage.masterTitle.toLowerCase();
  if (topicTitle && atomTitle && topicTitle !== atomTitle) {
    violations.push({
      code: "topic_fidelity",
      path: "lineage.masterTitle",
      message: "atom masterTitle drifted from frozen topic",
      severity: "warning",
    });
    gateResults.push(gate("topic_fidelity", "warn", "title drift", "warning"));
  } else {
    gateResults.push(gate("topic_fidelity", "pass", "topic title matches"));
  }

  // Direction fidelity on atom body
  const angle = atom.lineage.angle;
  const required = input.envelope.direction.requiredElements;
  let directionOk = true;
  if (required.includes("audience_problem") && !atom.kernel.audience_problem.trim()) {
    directionOk = false;
  }
  if (
    angle === "problem_solution" &&
    (!atom.kernel.why_problem_exists.trim() ||
      !atom.kernel.resolution.trim() ||
      !atom.kernel.core_tension.trim())
  ) {
    directionOk = false;
  }
  if (angle === "faq" && !(mod?.keyQuestion?.trim() || atom.kernel.hook_strategy.planted_question.trim())) {
    directionOk = false;
  }
  if (!directionOk) {
    violations.push({
      code: "direction_fidelity",
      path: "kernel",
      message: `atom body missing required elements for angle ${angle}`,
      severity: "warning",
    });
  }
  gateResults.push(
    gate(
      "direction_fidelity",
      directionOk ? "pass" : "warn",
      directionOk ? "direction elements present" : "direction elements incomplete",
      directionOk ? "info" : "warning"
    )
  );

  // Narrative completeness (soft on thin)
  const spine = mod?.canonicalNarrativeSpine;
  const narrativeComplete = Boolean(
    spine &&
      spine.setup.trim() &&
      spine.problem.trim() &&
      spine.resolution.trim()
  );
  const thinEnvelope = input.envelope.evidence.length < 2;
  if (!narrativeComplete && !thinEnvelope) {
    violations.push({
      code: "narrative_incomplete",
      path: "narrativeModules",
      message: "canonicalNarrativeSpine incomplete",
      severity: "warning",
    });
  }
  gateResults.push(
    gate(
      "narrative_completeness",
      narrativeComplete || thinEnvelope ? "pass" : "warn",
      narrativeComplete ? "narrative spine populated" : "narrative incomplete",
      narrativeComplete || thinEnvelope ? "info" : "warning"
    )
  );

  // Engagement integrity
  const engOk =
    !strat ||
    (!strat.internalAudienceTrigger.trim() && thinEnvelope) ||
    (Boolean(strat.internalAudienceTrigger.trim()) &&
      Boolean(strat.contentPayoff.expectedValue.trim()));
  if (strat && !engOk && !thinEnvelope) {
    violations.push({
      code: "engagement_integrity",
      path: "engagementBlueprint.strategy",
      message: "engagement strategy missing trigger or payoff",
      severity: "warning",
    });
  }
  gateResults.push(
    gate(
      "engagement_integrity",
      engOk ? "pass" : "warn",
      engOk ? "engagement ok" : "engagement incomplete",
      engOk ? "info" : "warning"
    )
  );

  // Distribution readiness
  const dist = atom.distributionContract;
  const distOk =
    thinEnvelope ||
    (dist.requiredInvariants.length > 0 &&
      dist.adaptableElements.length > 0 &&
      dist.mustNotImply.length > 0);
  if (!distOk) {
    violations.push({
      code: "distribution_readiness",
      path: "distributionContract",
      message: "distribution contract missing invariants/adaptable/mustNotImply",
      severity: "warning",
    });
  }
  gateResults.push(
    gate(
      "distribution_readiness",
      distOk ? "pass" : "warn",
      distOk ? "distribution ready" : "distribution incomplete",
      distOk ? "info" : "warning"
    )
  );

  // Channel neutrality
  const channelText = [
    atom.kernel.central_claim.canonical_wording,
    atom.kernel.payoff,
    ...narrativeAssertedTexts(atom),
  ].join(" ");
  const channelHit = PLATFORM_WORDS.test(channelText);
  if (channelHit) {
    violations.push({
      code: "channel_neutrality",
      path: "atom",
      message: "platform words / caption formatting found in atom content",
      severity: "warning",
    });
  }
  gateResults.push(
    gate(
      "channel_neutrality",
      channelHit ? "fail" : "pass",
      channelHit ? "platform wording detected" : "channel-neutral",
      channelHit ? "warning" : "info"
    )
  );

  // Internal consistency
  const shiftDiffers =
    atom.kernel.belief_shift.from.trim().toLowerCase() !==
    atom.kernel.belief_shift.to.trim().toLowerCase();
  const distinct = new Set([
    atom.kernel.audience_state.trim(),
    atom.kernel.audience_problem.trim(),
    atom.kernel.core_tension.trim(),
  ]);
  gateResults.push(
    gate(
      "internal_consistency",
      shiftDiffers && distinct.size >= 3 ? "pass" : "warn",
      !shiftDiffers
        ? "belief shift collapsed"
        : distinct.size >= 3
          ? "belief shift differs; audience fields distinct"
          : "audience_state/problem/tension not sufficiently distinct",
      shiftDiffers && distinct.size >= 3 ? "info" : "warning"
    )
  );

  // category_fidelity — warn-only in v1 (calibration). Promote clear mismatches later.
  const topicCategory = input.envelope.topic.topicCategory;
  let categoryFidelityWarn = false;
  if (topicCategory === "trust_proof") {
    const blob = [
      atom.kernel.central_claim.canonical_wording,
      atom.kernel.resolution,
      atom.kernel.payoff,
      atom.kernel.audience_problem,
    ]
      .join(" ")
      .toLowerCase();
    const hasProofSignals =
      /\b(proof|verif|evidence|licens|flat-?rate|credential|transparent|guarantee|claim)\b/i.test(
        blob
      );
    const beginnerOnly =
      /\b(first step|beginner|getting started|new to)\b/i.test(blob) &&
      !hasProofSignals;
    if (beginnerOnly || !hasProofSignals) {
      categoryFidelityWarn = true;
      violations.push({
        code: "category_fidelity",
        path: "lineage.topicCategory",
        message:
          "Selected trust_proof job but atom reads as generic beginner/checklist without proof/verify signals",
        severity: "warning",
      });
    }
  }
  gateResults.push(
    gate(
      "category_fidelity",
      !topicCategory ? "skip" : categoryFidelityWarn ? "warn" : "pass",
      !topicCategory
        ? "no topicCategory on envelope"
        : categoryFidelityWarn
          ? "category job mismatch (warn-only v1)"
          : `aligned with ${topicCategory}`,
      categoryFidelityWarn ? "warning" : "info"
    )
  );

  const depthOk =
    atom.kernel.why_problem_exists.trim().length >= 40 &&
    atom.kernel.core_tension.trim().length >= 40 &&
    atom.kernel.central_claim.canonical_wording.trim().length >= 20;

  const validClaims = atom.claimLedger.claims.filter((c) =>
    c.evidenceIds.some((id) =>
      input.envelope.evidence.some((e) => e.evidence_id === id)
    )
  );

  gateResults.push(
    gate(
      "strategic_completeness",
      depthOk ? "pass" : "warn",
      depthOk ? "kernel depth ok" : "kernel depth thin",
      depthOk ? "info" : "warning"
    )
  );

  const promiseGate = frameworkPromiseUnfulfilled(atom);
  if (promiseGate.unfulfilled) {
    violations.push({
      code: "framework_promise_unfulfilled",
      path: "narrativeModules.framework",
      message: `promised ${promiseGate.promised} checks/steps but delivered ${promiseGate.delivered}`,
      severity: "warning",
    });
    gateResults.push(
      gate(
        "framework_promise",
        "fail",
        `promised ${promiseGate.promised}, delivered ${promiseGate.delivered}`,
        "warning",
        "narrativeModules"
      )
    );
  } else if (promiseGate.promised > 0) {
    gateResults.push(
      gate(
        "framework_promise",
        "pass",
        `promised ${promiseGate.promised} matched by ${promiseGate.delivered} items`,
        "info"
      )
    );
  }

  const brandHook = brandInHookFields({ atom, envelope: input.envelope });
  if (brandHook.hit) {
    violations.push({
      code: "brand_in_hook",
      path: brandHook.paths[0] ?? "kernel.hook_strategy",
      message: `brand appears in educational hook fields: ${brandHook.paths.join(", ")}`,
      severity: "warning",
    });
    gateResults.push(
      gate(
        "brand_placement",
        "warn",
        "brand in hook fields for educational category",
        "warning"
      )
    );
  }

  const errors = violations.filter((v) => v.severity === "error");
  let buildStatus: BuildStatus = "complete";
  const statusReasons: import("./types").AtomStatusReason[] = [];

  if (errors.length > 0) {
    buildStatus = "invalid";
    statusReasons.push({
      source: "violations",
      message: `${errors.length} error-severity violation(s)`,
    });
  } else if (
    input.selfAssessed === "insufficient" ||
    (validClaims.length === 0 && input.envelope.evidence.length === 0)
  ) {
    buildStatus = "insufficient";
    if (input.selfAssessed === "insufficient") {
      statusReasons.push({
        source: "selfAssessed",
        message:
          "The model judged the evidence insufficient to support a full atom",
      });
    }
    if (validClaims.length === 0 && input.envelope.evidence.length === 0) {
      statusReasons.push({
        source: "claims",
        message: "no valid claims and empty envelope evidence",
      });
    }
  } else if (
    input.selfAssessed === "limited" ||
    input.envelope.preflight.status === "limited" ||
    !depthOk ||
    distinct.size < 3 ||
    !shiftDiffers ||
    validClaims.length < 2 ||
    framingHits.length > 0 ||
    !directionOk ||
    channelHit ||
    promiseGate.unfulfilled
  ) {
    buildStatus = "limited";
    if (input.selfAssessed === "limited") {
      statusReasons.push({
        source: "selfAssessed",
        message:
          "The model judged its own draft limited for this topic given the evidence",
      });
    }
    if (promiseGate.unfulfilled) {
      statusReasons.push({
        source: "framework_promise",
        ruleId: "framework_promise_unfulfilled",
        message: `Promised ${promiseGate.promised} checks/steps but only ${promiseGate.delivered} were enumerated — research needed before publish`,
      });
    }
    if (input.envelope.preflight.status === "limited") {
      statusReasons.push({
        source: "preflight",
        ruleId: "preflight",
        message: "evidence preflight status is limited",
      });
    }
    if (!depthOk) {
      statusReasons.push({
        source: "depth",
        path: "kernel",
        message: "kernel depth below floor",
      });
    }
    if (distinct.size < 3) {
      statusReasons.push({
        source: "internal_consistency",
        ruleId: "distinct_fields",
        message: `audience fields distinct count ${distinct.size} < 3`,
      });
    }
    if (!shiftDiffers) {
      statusReasons.push({
        source: "internal_consistency",
        path: "kernel.belief_shift",
        message: "belief_shift.from equals belief_shift.to",
      });
    }
    if (validClaims.length < 2) {
      statusReasons.push({
        source: "claims",
        message: `validClaims ${validClaims.length} < 2`,
      });
    }
    if (framingHits.length > 0) {
      statusReasons.push({
        source: "claim_like_framing",
        message: `${framingHits.length} claim-like framing hit(s)`,
      });
    }
    if (!directionOk) {
      statusReasons.push({
        source: "direction_fidelity",
        message: "direction required elements incomplete",
      });
    }
    if (channelHit) {
      statusReasons.push({
        source: "channel_neutrality",
        message: "platform wording detected",
      });
    }
  } else {
    buildStatus = "complete";
  }

  // Application-owned: selfAssessed may only demote, never promote.
  if (
    buildStatus === "complete" &&
    (!depthOk || validClaims.length < 2)
  ) {
    buildStatus = "limited";
    statusReasons.push({
      source: "application_owned",
      message: "demoted complete→limited (depth or claim count)",
    });
  }
  if (input.selfAssessed && buildStatus !== "invalid") {
    const rank = { insufficient: 1, limited: 2, complete: 3 } as const;
    const assessed = input.selfAssessed;
    const computedRank =
      buildStatus === "insufficient"
        ? 1
        : buildStatus === "limited"
          ? 2
          : 3;
    if (rank[assessed] < computedRank) {
      buildStatus = assessed;
      statusReasons.push({
        source: "selfAssessed",
        message: `rank override demoted to ${assessed}`,
      });
    }
  }

  if (categoryFidelityWarn) {
    statusReasons.push({
      source: "category_fidelity",
      ruleId: "category_fidelity",
      message:
        "warn-only: selected category job not clearly fulfilled (v1 calibration)",
    });
  }

  const next: ContentAtom = {
    ...atom,
    buildStatus,
    message_hash: computeMessageHash(atom),
  };

  const craftReport = buildAtomCraftReport(next);
  const researchHandoff = buildSpecialtyResearchHandoff(next, {
    ok: buildStatus !== "invalid",
    valid: buildStatus !== "invalid",
    buildStatus,
    resultingStatus: buildStatus,
    violations,
    gateResults,
    errors: violations.filter((v) => v.severity === "error"),
    warnings: violations.filter((v) => v.severity === "warning"),
    repairableFields: [],
    nonRepairableFailures: [],
    statusReasons,
    atom: next,
  });

  return finalizeReport({
    atom: next,
    buildStatus,
    violations,
    gateResults,
    statusReasons,
    craftReport,
    researchHandoff,
  });
}

function finalizeReport(input: {
  atom: ContentAtom;
  buildStatus: BuildStatus;
  violations: AtomValidationViolation[];
  gateResults: GateResult[];
  statusReasons?: import("./types").AtomStatusReason[];
  craftReport?: import("../craft-score").AtomCraftReport;
  researchHandoff?: import("../research-handoff").SpecialtyResearchHandoff | null;
}): AtomValidationReport {
  const errors = input.violations.filter((v) => v.severity === "error");
  const warnings = input.violations.filter((v) => v.severity === "warning");
  const repairableFields = [
    ...new Set(
      input.violations
        .map((v) => v.path.split("[")[0]!)
        .filter((p) => REPAIRABLE.has(p) || p.startsWith("claimLedger") || p.startsWith("kernel.supporting_proof"))
    ),
  ];
  const nonRepairableFailures = errors
    .filter((v) => !repairableFields.some((p) => v.path.startsWith(p)))
    .map((v) => v.code);

  const ok = input.buildStatus !== "invalid";
  return {
    ok,
    valid: ok,
    buildStatus: input.buildStatus,
    resultingStatus: input.buildStatus,
    violations: input.violations,
    gateResults: input.gateResults,
    errors,
    warnings,
    repairableFields,
    nonRepairableFailures,
    statusReasons: input.statusReasons ?? [],
    craftReport: input.craftReport,
    researchHandoff: input.researchHandoff ?? null,
    atom: input.atom,
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}
