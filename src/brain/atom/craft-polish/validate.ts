import {
  hasMedicalOrStudyClaim,
  hasNewNumbers,
  hasOutcomeClaimWithoutAttribution,
  tokenizeEntities,
} from "@/brain/evaluation/creative-safety";

import type { ContentAtom } from "../content-atom.schema";
import type { AtomBuildEnvelope } from "../build-envelope";
import type { CraftPolishResult } from "./types";
import { ATOM_CRAFT_POLISH_VERSION } from "./types";

function proseBlob(fields: CraftPolishResult["fields"]): string {
  return [
    fields.audience_problem,
    fields.why_problem_exists,
    fields.core_tension,
    fields.central_claim,
    fields.planted_question,
    fields.opening_intent,
    fields.hook_resolution,
    fields.resolution,
    fields.payoff,
    fields.intended_action,
    ...(fields.framework ?? []),
    ...(fields.steps ?? []),
    ...(fields.comparison_criteria ?? []),
    fields.ctaIntent ?? "",
  ].join(" ");
}

function allowedBlob(atom: ContentAtom, envelope: AtomBuildEnvelope): string {
  const k = atom.kernel;
  return [
    k.audience_problem,
    k.why_problem_exists,
    k.core_tension,
    k.central_claim.canonical_wording,
    k.hook_strategy.planted_question,
    k.hook_strategy.opening_intent,
    k.hook_strategy.resolution,
    k.resolution,
    k.payoff,
    k.intended_action,
    envelope.brand.name,
    envelope.brand.audience_primary,
    ...envelope.evidence.map((e) => e.summary),
    ...envelope.claimCapabilities.map((c) => c.permittedMeaning),
  ].join(" ");
}

function novelEntityCount(creative: string, allowed: Set<string>): string[] {
  const found: string[] = [];
  for (const token of tokenizeEntities(creative)) {
    if (allowed.has(token)) continue;
    if (
      /^(your|their|this|that|when|what|why|how|with|from|into|about|before|after|really|still|often|never|always|people|shoppers|buyers|clarity|guesswork|simple|clear|next|step|know|check|compare|choose|first|second|third|then|than|than|more|most|less|same|thing|things|product|products|option|options|label|labels|price|prices|search|results|checklist|checks|routine|criteria)$/.test(
        token
      )
    ) {
      continue;
    }
    found.push(token);
  }
  return found.slice(0, 8);
}

/**
 * Fail-closed validation for craft polish. Caller keeps pass-1 atom on failure.
 */
export function validateAtomCraftPolish(args: {
  atom: ContentAtom;
  envelope: AtomBuildEnvelope;
  result: CraftPolishResult;
}): { ok: true } | { ok: false; reasons: string[] } {
  const { atom, envelope, result } = args;
  const reasons: string[] = [];

  if (result.polishVersion !== ATOM_CRAFT_POLISH_VERSION) {
    reasons.push("polishVersion mismatch");
  }

  const fields = result.fields;
  const required = [
    fields.audience_problem,
    fields.core_tension,
    fields.central_claim,
    fields.planted_question,
    fields.opening_intent,
    fields.payoff,
    fields.intended_action,
  ];
  if (required.some((s) => !s?.trim())) {
    reasons.push("missing required prose fields");
  }

  if ((fields.intended_action ?? "").trim().endsWith("…")) {
    reasons.push("intended_action truncated");
  }
  if ((fields.intended_action ?? "").trim().length > 280) {
    reasons.push("intended_action exceeds 280 chars");
  }

  const creative = proseBlob(fields);
  const allowed = allowedBlob(atom, envelope);

  if (hasMedicalOrStudyClaim(creative) && !hasMedicalOrStudyClaim(allowed)) {
    reasons.push("medical/study claim introduced");
  }
  if (hasOutcomeClaimWithoutAttribution(creative)) {
    // Only fail if pass-1 also lacked attribution for that shape
    if (!hasOutcomeClaimWithoutAttribution(allowed)) {
      reasons.push("outcome claim without attribution");
    }
  }
  if (hasNewNumbers(creative, allowed)) {
    reasons.push("new numbers introduced");
  }

  const novel = novelEntityCount(creative, tokenizeEntities(allowed));
  if (novel.length >= 6) {
    reasons.push(`likely new entities: ${novel.slice(0, 4).join(", ")}`);
  }

  if (reasons.length > 0) return { ok: false, reasons };
  return { ok: true };
}
