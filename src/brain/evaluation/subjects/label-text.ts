/** Tiny shared text helpers — keeps subject modules free of import cycles. */

export function clampLabel(text: string, max = 64): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}
