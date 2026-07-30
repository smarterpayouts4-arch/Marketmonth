import type { BrandCore } from "@/brain/core/brand-core.schema";

import type { ContentAtom } from "./content-atom.schema";
import type { AtomValidationReport } from "./validate/types";

function mdEscape(s: string): string {
  return s.replace(/\r\n/g, "\n").trim();
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function collectDocumentText(atom: ContentAtom): string {
  const mod = atom.narrativeModules[atom.lineage.angle];
  const strat = atom.engagementBlueprint.strategy;
  const spine = mod?.canonicalNarrativeSpine;
  const parts = [
    atom.lineage.masterTitle,
    atom.kernel.audience_state,
    atom.kernel.audience_problem,
    atom.kernel.why_problem_exists,
    atom.kernel.core_tension,
    atom.kernel.central_claim.canonical_wording,
    atom.kernel.resolution,
    atom.kernel.payoff,
    atom.kernel.intended_action,
    atom.kernel.hook_strategy.planted_question,
    atom.kernel.hook_strategy.opening_intent,
    atom.kernel.hook_strategy.resolution,
    atom.kernel.belief_shift.from,
    atom.kernel.belief_shift.to,
    ...(mod?.framework ?? []),
    ...(mod?.steps ?? []),
    ...(mod?.comparisonCriteria ?? []),
    ...(mod?.supportingPoints ?? []).flatMap((p) => [p.point, p.explanation]),
    ...(mod?.importantDistinctions ?? []).flatMap((d) => [
      d.thisIs,
      d.thisIsNot,
    ]),
    ...(mod?.commonMisunderstandings ?? []).flatMap((m) => [
      m.misunderstanding,
      m.correction,
    ]),
    spine?.triggerConcept,
    spine?.setup,
    spine?.problem,
    spine?.explanation,
    spine?.keyInsight,
    spine?.resolution,
    spine?.takeaway,
    strat?.internalAudienceTrigger,
    strat?.externalTriggerConcept,
    strat?.desiredConsumptionAction,
    strat?.contentPayoff.expectedValue,
    strat?.meaningfulAudienceInvestment,
    ...atom.claimLedger.claims.map((c) => c.statement),
  ];
  return parts.filter(Boolean).join(" ");
}

function proofText(
  brandCore: BrandCore | undefined,
  id: string
): string {
  if (!brandCore) return "";
  const p = brandCore.proof_library.find((x) => x.proof_id === id);
  return p ? mdEscape(p.summary) : "";
}

export type ReadableDocumentInput = {
  brand: string;
  topic: string;
  atom: ContentAtom;
  report?: AtomValidationReport | null;
  brandCore?: BrandCore;
  admitted?: Array<{ proof_id: string; role: string; reason: string }>;
  rejected?: Array<{ proof_id: string; reason: string }>;
};

/**
 * Human-readable Content Atom document for operators (inspector / walkthrough).
 */
export function renderReadableDocument(input: ReadableDocumentInput): string {
  const { atom, brand, topic, report, brandCore } = input;
  const k = atom.kernel;
  const mod = atom.narrativeModules[atom.lineage.angle];
  const spine = mod?.canonicalNarrativeSpine;
  const strat = atom.engagementBlueprint.strategy;
  const dist = atom.distributionContract;
  const words = wordCount(collectDocumentText(atom));
  const gates = report?.gateResults ?? [];
  const passed = gates.filter((g) => g.outcome === "pass").length;
  const warned = gates.filter((g) => g.outcome === "warn").length;
  const failed = gates.filter((g) => g.outcome === "fail").length;
  const reasons = report?.statusReasons ?? [];

  const lines: string[] = [
    `CONTENT ATOM - ${brand} - ${topic}`,
    `Status: ${atom.buildStatus}    Words: ${words} (target 650-750, not a gate)`,
    `Lineage: ${atom.lineage.model ?? "deterministic"} / ${atom.lineage.promptVersion ?? "—"} / ${atom.lineage.atomPolicyVersion ?? "—"} / ${atom.lineage.createdBy ?? "—"}`,
    `Admission policy: ${atom.lineage.evidenceAdmissionPolicyVersion ?? "—"}`,
    `Gates: ${passed} passed, ${warned} warned, ${failed} failed`,
    ``,
  ];

  if (atom.buildStatus !== "complete" && reasons.length > 0) {
    lines.push(`WHY THIS IS ${atom.buildStatus.toUpperCase()}`);
    for (const r of reasons) {
      lines.push(`- [${r.source}] ${mdEscape(r.message)}`);
    }
    lines.push(``);
  }

  lines.push(
    `WHAT WE ARE TALKING ABOUT`,
    mdEscape(atom.lineage.masterTitle),
    ``,
    `WHO THIS IS FOR / THEIR SITUATION`,
    mdEscape(k.audience_state),
    ``,
    `THE PROBLEM / WHY IT EXISTS / THE TENSION`,
    mdEscape(k.audience_problem),
    mdEscape(k.why_problem_exists || "(empty)"),
    mdEscape(k.core_tension),
    ``,
    `THE THESIS`,
    mdEscape(k.central_claim.canonical_wording),
    ``,
    `INTENDED ACTION (post-consumption)`,
    mdEscape(k.intended_action || "(empty)"),
    ``,
    `THE RESOLUTION OR FRAMEWORK`,
    mdEscape(k.resolution || "(empty)"),
    ...(mod?.framework ?? []).map((f) => `- ${mdEscape(f)}`),
    ...(mod?.steps ?? []).map((s, i) => `${i + 1}. ${mdEscape(s)}`),
    ``,
    `WHAT THEY UNDERSTAND AFTERWARD`,
    `${mdEscape(k.belief_shift.from)} → ${mdEscape(k.belief_shift.to)}`,
    mdEscape(k.payoff),
    ``,
    `SUPPORTING POINTS`,
    ...(mod?.supportingPoints.length
      ? mod.supportingPoints.map((p) => {
          const pt = proofText(brandCore, p.evidence_id);
          return `- ${mdEscape(p.point)} (${p.evidence_id})\n  ${mdEscape(p.explanation)}${pt ? `\n  proof: ${pt}` : ""}`;
        })
      : ["(none)"]),
    ``,
    `SUPPORTING PROOF`,
    ...(k.supporting_proof.length
      ? k.supporting_proof.map((p) => {
          const pt = proofText(brandCore, p.evidence_id);
          return `- ${p.proof_id}: ${mdEscape(p.meaning)}${pt ? `\n  ${pt}` : ""}`;
        })
      : ["(none)"]),
    ``,
    `IMPORTANT DISTINCTIONS`,
    ...(mod?.importantDistinctions.length
      ? mod.importantDistinctions.map(
          (d) =>
            `- This is: ${mdEscape(d.thisIs)}\n  This is not: ${mdEscape(d.thisIsNot)}`
        )
      : ["(none)"]),
    ``,
    `COMMON MISUNDERSTANDINGS`,
    ...(mod?.commonMisunderstandings.length
      ? mod.commonMisunderstandings.map(
          (m) =>
            `- ${mdEscape(m.misunderstanding)}\n  → ${mdEscape(m.correction)}`
        )
      : ["(none)"]),
    ``,
    `NARRATIVE SPINE`,
    spine
      ? [
          `trigger: ${mdEscape(spine.triggerConcept)}`,
          `setup: ${mdEscape(spine.setup)}`,
          `problem: ${mdEscape(spine.problem)}`,
          `explanation: ${mdEscape(spine.explanation)}`,
          `insight: ${mdEscape(spine.keyInsight)}`,
          `resolution: ${mdEscape(spine.resolution)}`,
          `takeaway: ${mdEscape(spine.takeaway)}`,
        ].join("\n")
      : "(none)",
    ``,
    `ENGAGEMENT STRATEGY`,
    strat
      ? [
          `internal trigger: ${mdEscape(strat.internalAudienceTrigger)}`,
          `external trigger: ${mdEscape(strat.externalTriggerConcept)}`,
          `action: ${mdEscape(strat.desiredConsumptionAction)}`,
          `friction: ${mdEscape(strat.actionFriction)}`,
          `payoff: ${mdEscape(strat.contentPayoff.expectedValue)}`,
          `investment: ${mdEscape(strat.meaningfulAudienceInvestment || "(empty)")}`,
          `continuation: ${mdEscape(strat.continuationTrigger || "(empty)")}`,
          `boundaries: ${strat.ethicalBoundaries.map(mdEscape).join("; ") || "—"}`,
        ].join("\n")
      : "(none)",
    ``,
    `DISTRIBUTION CONTRACT`,
    `ctaIntent: ${mdEscape(dist.ctaIntent || "(empty)")}`,
    `invariants: ${dist.requiredInvariants.map(mdEscape).join("; ") || "—"}`,
    `adaptable: ${dist.adaptableElements.map(mdEscape).join("; ") || "—"}`,
    `voice: ${dist.brandVoiceConstraints.map(mdEscape).join("; ") || "—"}`,
    `ctaBoundaries: ${dist.ctaBoundaries.map(mdEscape).join("; ") || "—"}`,
    `mustNotImply: ${dist.mustNotImply.map(mdEscape).join("; ") || "—"}`,
    ``,
    `CLAIM LEDGER (${atom.claimLedger.claims.length})`,
    ...atom.claimLedger.claims.map((c) => {
      const proofs = c.evidenceIds
        .map((id) => proofText(brandCore, id))
        .filter(Boolean)
        .join(" | ");
      return `- [${c.classification}] ${mdEscape(c.statement)}\n  rule=${c.claimRuleId ?? "—"} evidence=${c.evidenceIds.join(",")}${proofs ? `\n  proof: ${proofs}` : ""}`;
    }),
    ``,
    `WHAT THIS WILL NOT CLAIM`,
    ...[
      ...atom.claimLedger.mustNotImply,
      ...atom.distributionContract.mustNotImply,
      ...atom.safety.banned_claims,
    ]
      .filter(Boolean)
      .slice(0, 16)
      .map((x) => `- ${mdEscape(x)}`),
    ``,
    `MISSING INFORMATION`,
    ...(atom.missing_information.length
      ? atom.missing_information.map((m) => `- ${mdEscape(m)}`)
      : ["(none)"]),
    ``,
    `EVIDENCE ADMITTED`,
    ...(input.admitted?.length
      ? input.admitted.map((a) => {
          const pt = proofText(brandCore, a.proof_id);
          return `- ${a.proof_id} [${a.role}] ${a.reason}${pt ? `\n  ${pt}` : ""}`;
        })
      : atom.safety.allowed_evidence_ids.map((id) => {
          const pt = proofText(brandCore, id);
          return `- ${id}${pt ? `\n  ${pt}` : ""}`;
        })),
    ``,
    `EVIDENCE REJECTED`,
    ...(input.rejected?.length
      ? input.rejected
          .slice(0, 24)
          .map((r) => `- ${r.proof_id}: ${r.reason}`)
      : ["(none recorded)"]),
    ``,
    `GATE SUMMARY`,
    ...gates.map((g) => `- [${g.outcome}] ${g.gateId}: ${g.message}`),
    ``
  );

  return lines.join("\n");
}
