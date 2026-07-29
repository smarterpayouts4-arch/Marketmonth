const BODY_COPY_RE =
  /\b(often|feel|feels|confused|overwhelmed|not less|not more)\b/i;

const CLAUSE_RE = /,\s*(?:not|and|but|who|which|when|because|so|yet)\b/i;

const SENTENCE_FRAGMENT_RE =
  /^(individuals|people|customers|users|shoppers|buyers)\s+(often|may|might|can|will|should|feel)\s/i;

/**
 * Prefer short audience noun phrases; reject body-copy sentence fragments.
 * Returns undefined when the raw value should fall back to a generic line.
 */
export function sanitizeAudienceLabel(
  raw: string | undefined,
  brandName?: string
): string | undefined {
  void brandName;
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 80) return undefined;
  if (BODY_COPY_RE.test(trimmed)) return undefined;
  if (CLAUSE_RE.test(trimmed)) return undefined;
  if (SENTENCE_FRAGMENT_RE.test(trimmed)) return undefined;
  if (/\.\s+\S/.test(trimmed)) return undefined;
  return trimmed;
}

export function audienceLineForContext(args: {
  audience?: string;
  brandName: string;
}): string {
  return (
    sanitizeAudienceLabel(args.audience, args.brandName) ??
    `people researching what ${args.brandName} offers`
  );
}
