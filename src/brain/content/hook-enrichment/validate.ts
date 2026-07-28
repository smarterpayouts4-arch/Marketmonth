import type { ContentVariation } from "@/brain/content/types";
import {
  MEDICAL_CLAIM_RE,
  NUMBER_RE,
  STUDY_CERT_RE,
  tokenizeEntities,
} from "@/brain/evaluation/creative-safety";

import type { HookEnrichmentRequest, HookEnrichmentResult } from "./types";
import { HOOK_ENRICHMENT_VERSION } from "./types";

function collectAllowedTokens(request: HookEnrichmentRequest): Set<string> {
  const blob = [
    request.masterTitle,
    request.groundedSummary,
    request.audienceLabel,
    request.originalHook,
    ...request.allowedFacts,
  ].join(" ");
  return tokenizeEntities(blob);
}

function introducedForbiddenTokens(
  enriched: string,
  allowed: Set<string>
): string[] {
  const found: string[] = [];
  for (const token of tokenizeEntities(enriched)) {
    if (!allowed.has(token)) {
      // Allow common hook vocabulary
      if (
        /^(your|their|this|that|when|what|why|how|with|from|into|about|before|after|really|still|often|never|always|people|shoppers|buyers|clarity|guesswork|simple|clear|next|step|know|check|compare|choose)$/.test(
          token
        )
      ) {
        continue;
      }
      found.push(token);
    }
  }
  return found.slice(0, 8);
}

/**
 * Validate AI hook polish. Fail closed → caller keeps deterministic variation.
 */
export function validateHookEnrichment(args: {
  request: HookEnrichmentRequest;
  result: HookEnrichmentResult;
  variation: ContentVariation;
  masterTitle: string;
}): { ok: true } | { ok: false; reasons: string[] } {
  const { request, result, variation, masterTitle } = args;
  const reasons: string[] = [];

  if (result.enrichmentVersion !== HOOK_ENRICHMENT_VERSION) {
    reasons.push("enrichmentVersion mismatch");
  }

  const hook = result.hook?.trim() ?? "";
  if (!hook || hook.length < 8 || hook.length > 120) {
    reasons.push("hook length out of bounds");
  }

  // Must not rewrite master title into the hook as a whole new topic claim
  if (masterTitle !== request.masterTitle) {
    reasons.push("masterTitle mutated in request");
  }

  const creative = [hook, result.tensionLine ?? "", result.payoffLine ?? ""].join(
    " "
  );

  if (MEDICAL_CLAIM_RE.test(creative)) {
    reasons.push("medical claim detected");
  }
  if (STUDY_CERT_RE.test(creative)) {
    reasons.push("study/certification claim detected");
  }

  const originalNumbers = new Set(
    (request.originalHook.match(NUMBER_RE) ?? []).map((n) => n.toLowerCase())
  );
  const allowedFactBlob = request.allowedFacts.join(" ");
  for (const n of allowedFactBlob.match(NUMBER_RE) ?? []) {
    originalNumbers.add(n.toLowerCase());
  }
  for (const n of creative.match(NUMBER_RE) ?? []) {
    if (!originalNumbers.has(n.toLowerCase())) {
      reasons.push(`new number introduced: ${n}`);
      break;
    }
  }

  const allowed = collectAllowedTokens(request);
  const novel = introducedForbiddenTokens(creative, allowed);
  // Soft gate: only fail when many novel long tokens suggest new entities
  if (novel.length >= 4) {
    reasons.push(`likely new entities: ${novel.slice(0, 4).join(", ")}`);
  }

  // Evidence IDs on variation must remain a subset of grounded input (unchanged)
  // Caller patches only creative fields — verify angle untouched by checking request
  if (result.hook && result.hook === variation.angle) {
    reasons.push("hook incorrectly equals angle");
  }

  if (reasons.length > 0) return { ok: false, reasons };
  return { ok: true };
}

/** Evidence IDs after enrichment must be ⊆ grounded input evidence. */
export function evidenceIdsSubset(
  after: string[],
  grounded: string[]
): boolean {
  const allowed = new Set(grounded);
  return after.every((id) => allowed.has(id));
}
