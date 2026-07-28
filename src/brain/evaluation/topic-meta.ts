/** Internal / ops instructions — never customer-facing topic nouns. */
const META_INSTRUCTION_PREFIXES = [
  "clarify ",
  "tighten ",
  "improve seo",
  "improve homepage",
  "fix homepage",
  "update seo",
  "rewrite ",
  "optimize homepage",
  "optimize seo",
] as const;

/** Detect internal SEO / ops task phrasing that must not become headlines. */
export function isMetaInstructionalPhrase(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return true;
  if (META_INSTRUCTION_PREFIXES.some((p) => t.startsWith(p))) return true;
  if (
    /\b(homepage messaging|lead offer|seo copy)\b/.test(t) &&
    /^(clarify|tighten|improve|fix|update)/.test(t)
  ) {
    return true;
  }
  return false;
}

export function customerFacingOpportunities(context: {
  contentOpportunities: string[];
  marketingOpportunity?: string;
}): string[] {
  const fromOps = context.contentOpportunities
    .map((o) => o.trim())
    .filter(Boolean)
    .filter((o) => !isMetaInstructionalPhrase(o));
  const fromMarketing = context.marketingOpportunity?.trim();
  const merged = [...fromOps];
  if (
    fromMarketing &&
    !isMetaInstructionalPhrase(fromMarketing) &&
    !merged.some((m) => m.toLowerCase() === fromMarketing.toLowerCase())
  ) {
    merged.unshift(fromMarketing);
  }
  return merged;
}
