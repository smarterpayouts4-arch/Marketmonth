/**
 * Trim and clamp to max characters on a word boundary (never mid-word).
 * Falls back to hard slice only when no whitespace exists before the limit.
 */
export function wordSafeClamp(value: string | null | undefined, max: number): string {
  const t = (value ?? "").trim();
  if (t.length <= max) return t;
  if (max <= 1) return "…";
  const budget = max - 1;
  const slice = t.slice(0, budget);
  const lastSpace = slice.lastIndexOf(" ");
  if (lastSpace >= Math.floor(budget * 0.5)) {
    return `${slice.slice(0, lastSpace).trimEnd()}…`;
  }
  return `${slice}…`;
}
