export function clamp(text: string, max: number): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

export const GENERIC_DECISION_PREFIX =
  "how to make clearer marketing decisions";

export function isGenericDecisionTitle(title: string): boolean {
  return title.trim().toLowerCase().startsWith(GENERIC_DECISION_PREFIX);
}

export function naturalCategoryNoun(label: string): string {
  const t = label.trim().toLowerCase();
  if (t === "supplement") return "supplements";
  if (t === "vitamin") return "vitamins";
  if (t === "mineral") return "minerals";
  return label.trim();
}
