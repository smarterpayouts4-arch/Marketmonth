import { contentDirectionsHandoffV1Schema } from "./schemas";
import type {
  ContentDirectionResult,
  ContentDirectionsHandoffV1,
  ContentVariation,
} from "./types";
import { REQUIRED_VARIATION_COUNT } from "./types";

export type HandoffValidation =
  | { ok: true; handoff: ContentDirectionsHandoffV1 }
  | { ok: false; errors: string[] };

const EXTRA_CONTEXT_SUMMARY_MAX = 280;

/**
 * Build handoff from a ready/partial result + selected variation id.
 */
export function buildContentDirectionsHandoff(args: {
  result: Extract<ContentDirectionResult, { status: "ready" | "partially_ready" }>;
  selectedVariationId: string;
  brandDomain: string;
  selectedAt?: string;
  marketingFocus?: string;
  extraContextSummary?: string;
}): HandoffValidation {
  const { result, selectedVariationId, brandDomain } = args;
  const errors: string[] = [];

  if (result.variations.length !== REQUIRED_VARIATION_COUNT) {
    errors.push(`Expected ${REQUIRED_VARIATION_COUNT} variations`);
  }

  const member = result.variations.find((v) => v.id === selectedVariationId);
  if (!member) {
    errors.push("selectedVariationId is not a member of variations");
  }

  const domain = normalizeDomain(brandDomain);
  if (!domain) {
    errors.push("brand domain is required");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const variations = result.variations as [
    ContentVariation,
    ContentVariation,
    ContentVariation,
    ContentVariation,
    ContentVariation,
    ContentVariation,
  ];

  const handoff: ContentDirectionsHandoffV1 = {
    version: 1,
    generationId: result.generationId,
    contextVersion: result.contextVersion,
    brand: { name: result.brandName, domain },
    mode: result.mode,
    masterTopic: result.masterTopic,
    variations,
    selectedVariationId,
    selectedAt: args.selectedAt ?? new Date().toISOString(),
  };

  if (args.marketingFocus?.trim()) {
    handoff.marketingFocus = args.marketingFocus.trim();
  }
  if (args.extraContextSummary?.trim()) {
    handoff.extraContextSummary = summarizeExtraContext(
      args.extraContextSummary
    );
  }

  return validateContentDirectionsHandoff(handoff);
}

export function validateContentDirectionsHandoff(
  raw: unknown,
  expectedDomain?: string
): HandoffValidation {
  const parsed = contentDirectionsHandoffV1Schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map(
        (issue) => issue.message || issue.path.join(".")
      ),
    };
  }

  const handoff = parsed.data as ContentDirectionsHandoffV1;

  if (expectedDomain) {
    if (
      normalizeDomain(handoff.brand.domain) !== normalizeDomain(expectedDomain)
    ) {
      return {
        ok: false,
        errors: ["Handoff domain does not match active brand"],
      };
    }
  }

  return { ok: true, handoff };
}

export function summarizeExtraContext(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= EXTRA_CONTEXT_SUMMARY_MAX) return cleaned;
  return `${cleaned.slice(0, EXTRA_CONTEXT_SUMMARY_MAX - 1)}…`;
}

export function normalizeDomain(domain: string): string {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];
}
