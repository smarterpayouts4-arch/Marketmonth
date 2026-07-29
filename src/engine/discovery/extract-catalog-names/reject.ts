/** Aligned with topic-subject / parse-fixture catalog rejects. */
export const CATALOG_PLATFORM_REJECT_RE =
  /\b(search|comparison|compare|builder|advisor|filter|filters|console|dashboard|platform|engine|tool|toolkit|sdk|api|app|software|service|quiz|explorer|finder)\b/i;

export function isRejectedCatalogName(name: string): boolean {
  const t = name.trim();
  if (!t || t.length < 2 || t.length > 80) return true;
  if (CATALOG_PLATFORM_REJECT_RE.test(t)) return true;
  if (/^https?:\/\//i.test(t) || /@context|schema\.org/i.test(t)) return true;
  return false;
}
