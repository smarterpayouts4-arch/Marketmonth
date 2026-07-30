import type { ContentAtom } from "./content-atom.schema";
import type { AtomValidationReport } from "./validate/types";

export type LimitationsAcknowledgement = {
  acknowledgedAt: string;
  acknowledgedBy?: string;
  limitations: string[];
};

function humanizeStatusReason(source: string, message: string): string {
  if (source === "selfAssessed") return message;
  if (source === "framework_promise") return message;
  if (source === "preflight") {
    return "Evidence on hand is enough for a direction, but not yet for a publish-ready deep atom";
  }
  if (source === "depth") {
    return "Core explanation fields are still too thin for a complete atom";
  }
  if (source === "claims") return message;
  return message;
}

/**
 * Derive human-readable limitation list for UI + acknowledgement contract.
 * Client-safe — no crypto / LLM imports.
 */
export function deriveLimitations(
  atom: ContentAtom,
  report?: AtomValidationReport | null
): string[] {
  const fromReasons =
    report?.statusReasons?.map((r) =>
      humanizeStatusReason(r.source, r.message)
    ) ?? [];
  const fromGates =
    report?.gateResults
      ?.filter((g) => g.outcome === "fail" || g.outcome === "warn")
      .filter((g) => g.gateId !== "framework_promise")
      .map((g) => g.message) ?? [];
  const fromMissing = atom.missing_information.map((m) => m.trim());
  const fromWarnings =
    report?.warnings
      ?.filter((w) => w.code !== "framework_promise_unfulfilled")
      .map((w) => w.message) ?? [];
  return [
    ...new Set([
      ...fromReasons,
      ...fromGates,
      ...fromWarnings,
      ...fromMissing,
    ]),
  ].filter(Boolean);
}

/** Bucketed limited-status view for review UI. */
export function deriveLimitationBuckets(
  atom: ContentAtom,
  report?: AtomValidationReport | null
): {
  whatWeKnow: string[];
  whatWeInfer: string[];
  whatNeedsResearch: string[];
} {
  const whatWeKnow = atom.kernel.supporting_proof
    .map((p) => p.meaning.trim())
    .filter(Boolean)
    .slice(0, 6);
  const whatWeInfer = (report?.statusReasons ?? [])
    .filter(
      (r) => r.source === "selfAssessed" || r.source === "claim_like_framing"
    )
    .map((r) => humanizeStatusReason(r.source, r.message));
  const whatNeedsResearch = [
    ...atom.missing_information,
    ...(report?.statusReasons ?? [])
      .filter((r) =>
        /framework_promise|preflight|depth|research/i.test(r.source)
      )
      .map((r) => humanizeStatusReason(r.source, r.message)),
    ...(report?.researchHandoff?.unresolvedQuestions ?? []),
  ]
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    whatWeKnow: [...new Set(whatWeKnow)].slice(0, 8),
    whatWeInfer: [...new Set(whatWeInfer)].slice(0, 8),
    whatNeedsResearch: [...new Set(whatNeedsResearch)].slice(0, 12),
  };
}
