import type { GrowthDirectionId } from "./types";

export type GrowthFooterRight = "use-direction" | "build";

/** Pure footer-right kind for Growth Direction (acceptance-tested). */
export function growthFooterRightKind(input: {
  selected?: GrowthDirectionId;
  committed?: GrowthDirectionId;
}): GrowthFooterRight {
  if (
    input.committed &&
    input.selected &&
    input.committed === input.selected
  ) {
    return "build";
  }
  return "use-direction";
}

/** Selecting a different direction invalidates a prior commit. */
export function nextCommittedAfterSelect(
  selected: GrowthDirectionId,
  previousCommitted?: GrowthDirectionId
): GrowthDirectionId | undefined {
  if (previousCommitted && previousCommitted !== selected) {
    return undefined;
  }
  return previousCommitted;
}

export function isUseDirectionDisabled(selected?: GrowthDirectionId): boolean {
  return !selected;
}
