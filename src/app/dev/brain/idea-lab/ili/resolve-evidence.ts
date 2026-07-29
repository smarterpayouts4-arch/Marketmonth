import type { IdeaLabEvidenceClaimView } from "@/brain/evaluation/idea-lab.types";

export type ResolvedEvidenceClaim = {
  id: string;
  field?: string;
  claim: string;
};

export function resolveEvidenceClaims(
  evidenceIds: string[],
  claimsById?: Record<string, IdeaLabEvidenceClaimView>
): ResolvedEvidenceClaim[] {
  return evidenceIds.map((id) => {
    const entry = claimsById?.[id];
    if (entry) {
      return { id, field: entry.field, claim: entry.claim };
    }
    return { id, claim: id };
  });
}
