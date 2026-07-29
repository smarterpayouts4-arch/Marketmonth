import { isRejectedCatalogName } from "./reject";

export const VITAMIN_HEAD_RE = /^(Vitamin\s+[A-Z]\d*)\b/i;
export const MINERAL_HEAD_RE =
  /^(Magnesium|Zinc|Calcium|Iron|Potassium|Selenium|Iodine|Copper|Chromium|Manganese)\b/i;
export const OTHER_INGREDIENT_HEAD_RE =
  /^(Omega-?\d|Ashwagandha|Probiotics|Creatine|Collagen|Lion'?s\s+Mane|B12|Methylcobalamin|Cyanocobalamin)\b/i;

const SECTION_LABEL_RE =
  /^(vitamins|minerals|more categories|categories|services|products|our services|about|home|welcome|blog|resources)\b/i;

const MARKETING_LEAD_RE =
  /^(how|why|what|when|get|learn|discover|welcome|explore|shop|buy)\b/i;

/** Deglue “Vitamin DThe Sunshine…” → “Vitamin D The Sunshine…”. */
export function deglueTitleCase(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]\d*)([A-Z][a-z])/g, "$1 $2");
}

export function normalizeIngredientName(name: string): string {
  const t = name.replace(/\s+/g, " ").trim();
  if (/^b12$/i.test(t)) return "Vitamin B12";
  if (/^omega\s*-?\s*3$/i.test(t)) return "Omega-3";
  if (/^lion'?s\s+mane$/i.test(t)) return "Lion's Mane";
  const vit = t.match(/^vitamin\s+(.+)$/i);
  if (vit) return `Vitamin ${vit[1].trim().toUpperCase()}`;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * Pull a shopper-facing catalog noun from a heading.
 * Prefer family-specific extraction when present; otherwise accept a short
 * generic product/service noun (industry-agnostic — not vitamin-only).
 */
export function cleanCatalogHeading(raw: string): string | null {
  const deglued = deglueTitleCase(raw);
  if (isRejectedCatalogName(deglued)) return null;
  if (SECTION_LABEL_RE.test(deglued)) return null;

  const vitamin = deglued.match(VITAMIN_HEAD_RE)?.[1];
  if (vitamin) return normalizeIngredientName(vitamin);

  const mineral = deglued.match(MINERAL_HEAD_RE)?.[1];
  if (mineral) return normalizeIngredientName(mineral);

  const other = deglued.match(OTHER_INGREDIENT_HEAD_RE)?.[1];
  if (other) return normalizeIngredientName(other);

  // Generic catalog noun — never hard-require supplement vocabulary.
  const words = deglued.split(/\s+/).filter(Boolean);
  if (
    words.length >= 1 &&
    words.length <= 6 &&
    deglued.length <= 60 &&
    !/[.!?]/.test(deglued) &&
    !MARKETING_LEAD_RE.test(deglued)
  ) {
    return deglued.charAt(0).toUpperCase() + deglued.slice(1);
  }

  return null;
}
