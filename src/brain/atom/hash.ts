import { createHash } from "node:crypto";

/** Stable short hash for strategy / message identity. */
export function stableHash(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}

export function hashBeliefShift(shift: { from: string; to: string }): string {
  return stableHash(
    `${shift.from.trim().toLowerCase()}→${shift.to.trim().toLowerCase()}`
  );
}

export function hashText(value: string): string {
  return stableHash(value.trim().toLowerCase());
}

export function beliefShiftHash(shift: { from: string; to: string }): string {
  return hashBeliefShift(shift);
}

export function payoffHash(value: string): string {
  return hashText(value);
}

export function intendedActionHash(value: string): string {
  return hashText(value);
}

export function messageHash(parts: string | readonly string[]): string {
  const joined = Array.isArray(parts) ? parts.join("|") : String(parts);
  return `mh_${stableHash(joined.trim().toLowerCase())}`;
}
