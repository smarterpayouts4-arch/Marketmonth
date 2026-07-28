import * as cheerio from "cheerio";

import { stripNonContent } from "./strip-non-content";
import type { CatalogProduct, CrawlCorpus } from "./types";

/** Aligned with topic-subject / parse-fixture catalog rejects. */
export const CATALOG_PLATFORM_REJECT_RE =
  /\b(search|comparison|compare|builder|advisor|filter|filters|console|dashboard|platform|engine|tool|toolkit|sdk|api|app|software|service|quiz|explorer|finder)\b/i;

const MAX_CATALOG = 8;

const VITAMIN_HEAD_RE = /^(Vitamin\s+[A-Z]\d*)\b/i;
const MINERAL_HEAD_RE =
  /^(Magnesium|Zinc|Calcium|Iron|Potassium|Selenium|Iodine|Copper|Chromium|Manganese)\b/i;
const OTHER_INGREDIENT_HEAD_RE =
  /^(Omega-?\d|Ashwagandha|Probiotics|Creatine|Collagen|Lion'?s\s+Mane|B12|Methylcobalamin|Cyanocobalamin)\b/i;

export function isRejectedCatalogName(name: string): boolean {
  const t = name.trim();
  if (!t || t.length < 2 || t.length > 80) return true;
  if (CATALOG_PLATFORM_REJECT_RE.test(t)) return true;
  if (/^https?:\/\//i.test(t) || /@context|schema\.org/i.test(t)) return true;
  return false;
}

/** Deglue “Vitamin DThe Sunshine…” → “Vitamin D The Sunshine…”. */
export function deglueTitleCase(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .trim()
    // MagnesiumThe → Magnesium The
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    // Vitamin DThe / B12The → Vitamin D The / B12 The
    .replace(/([A-Z]\d*)([A-Z][a-z])/g, "$1 $2");
}

/**
 * Pull a shopper-facing ingredient/catalog noun from a catalog heading.
 * Returns null for section labels and tool phrasing.
 */
export function cleanCatalogHeading(raw: string): string | null {
  const deglued = deglueTitleCase(raw);
  if (isRejectedCatalogName(deglued)) return null;
  if (/^(vitamins|minerals|more categories|categories)\b/i.test(deglued)) {
    return null;
  }

  const vitamin = deglued.match(VITAMIN_HEAD_RE)?.[1];
  if (vitamin) return normalizeIngredientName(vitamin);

  const mineral = deglued.match(MINERAL_HEAD_RE)?.[1];
  if (mineral) return normalizeIngredientName(mineral);

  const other = deglued.match(OTHER_INGREDIENT_HEAD_RE)?.[1];
  if (other) return normalizeIngredientName(other);

  return null;
}

function normalizeIngredientName(name: string): string {
  const t = name.replace(/\s+/g, " ").trim();
  if (/^b12$/i.test(t)) return "Vitamin B12";
  if (/^omega\s*-?\s*3$/i.test(t)) return "Omega-3";
  if (/^lion'?s\s+mane$/i.test(t)) return "Lion's Mane";
  const vit = t.match(/^vitamin\s+(.+)$/i);
  if (vit) return `Vitamin ${vit[1].trim().toUpperCase()}`;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function scrubCatalogProducts(
  products: CatalogProduct[],
  max = MAX_CATALOG
): CatalogProduct[] {
  const out: CatalogProduct[] = [];
  const seen = new Set<string>();
  for (const p of products) {
    const name = p.name?.trim();
    if (!name || isRejectedCatalogName(name)) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      name,
      price: p.price,
      sourceUrl: p.sourceUrl,
    });
    if (out.length >= max) break;
  }
  return out;
}

function loadClean(html: string) {
  const $ = cheerio.load(html);
  stripNonContent($);
  return $;
}

/** Mine vitamin/mineral nouns from products/catalog pages. */
export function mineCatalogPageProducts(corpus: CrawlCorpus): CatalogProduct[] {
  const out: CatalogProduct[] = [];
  const seen = new Set<string>();

  for (const page of corpus.pages) {
    if (page.kind !== "products" && !/catalog/i.test(page.url)) continue;
    const $ = loadClean(page.html);
    $("h1, h2, h3, h4, a, li, [class*='product'], [class*='ingredient']").each(
      (_, el) => {
        const raw = $(el).text().replace(/\s+/g, " ").trim();
        if (raw.length < 2 || raw.length > 100) return;
        const name = cleanCatalogHeading(raw);
        if (!name || isRejectedCatalogName(name)) return;
        const key = name.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        out.push({ name, sourceUrl: page.url });
      }
    );
  }

  return out;
}

const EXPLORER_CHIP_RE =
  /\b(Magnesium|Vitamin\s+D\d*|Vitamin\s+C|Omega-?\s*3|Ashwagandha|Probiotics|B12|Zinc|Creatine|Collagen|Lion'?s\s+Mane)\b/gi;

/** Chip / suggestion nouns from ingredient explorer style pages. */
export function mineExplorerIngredientChips(
  corpus: CrawlCorpus
): CatalogProduct[] {
  const out: CatalogProduct[] = [];
  const seen = new Set<string>();

  for (const page of corpus.pages) {
    if (!/ingredient|explorer|tools/i.test(page.url)) continue;
    const $ = loadClean(page.html);
    $("a, button, [role='button'], li, span").each((_, el) => {
      const raw = $(el).text().replace(/\s+/g, " ").trim();
      if (raw.length < 2 || raw.length > 40) return;
      if (/\s{2,}/.test(raw) || raw.split(/\s+/).length > 4) return;
      const name = cleanCatalogHeading(raw) ??
        (OTHER_INGREDIENT_HEAD_RE.test(raw) || MINERAL_HEAD_RE.test(raw)
          ? normalizeIngredientName(raw)
          : null);
      if (!name || isRejectedCatalogName(name)) return;
      const key = name.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ name, sourceUrl: page.url });
    });

    // Client-rendered chip lists often concatenate; also scan page text.
    const blob = $("main, article, body").text();
    for (const match of blob.match(EXPLORER_CHIP_RE) ?? []) {
      const name = normalizeIngredientName(match);
      if (!name || isRejectedCatalogName(name)) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ name, sourceUrl: page.url });
    }
  }

  return out;
}

/**
 * When homepage discusses form tradeoffs, add shopper-facing form names
 * only if the base mineral/vitamin is already in the catalog set.
 */
export function enrichFormVariants(
  catalog: CatalogProduct[],
  corpus: CrawlCorpus
): CatalogProduct[] {
  const home =
    corpus.pages.find((p) => p.kind === "home") ?? corpus.pages[0];
  if (!home) return catalog;

  const text = loadClean(home.html)("main, article, body")
    .text()
    .replace(/\s+/g, " ");
  const byLower = new Map(
    catalog.map((p) => [p.name.toLowerCase(), p] as const)
  );
  const extras: CatalogProduct[] = [];

  const hasMagnesium = [...byLower.keys()].some((k) => k.includes("magnesium"));
  if (
    hasMagnesium &&
    /glycinate\s+vs\s+oxide|glycinate/i.test(text) &&
    !byLower.has("magnesium glycinate")
  ) {
    extras.push({
      name: "Magnesium glycinate",
      sourceUrl: home.url,
    });
  }

  const hasVitaminD = [...byLower.keys()].some(
    (k) => k === "vitamin d" || k.startsWith("vitamin d")
  );
  if (
    hasVitaminD &&
    /\bD3\s+vs\s+D2\b|\bD3\b/i.test(text) &&
    !byLower.has("vitamin d3")
  ) {
    extras.push({
      name: "Vitamin D3",
      sourceUrl: home.url,
    });
  }

  // Prefer form-enriched shopper nouns when the 8-slot cap binds.
  return scrubCatalogProducts([...extras, ...catalog], MAX_CATALOG);
}

/** Shopper-facing priority for the 8-slot catalog cap (Zynava-style catalogs). */
const CATALOG_PRIORITY_RE: RegExp[] = [
  /^magnesium glycinate$/i,
  /^vitamin d3$/i,
  /^magnesium$/i,
  /^vitamin c$/i,
  /^vitamin d$/i,
  /^vitamin b12$/i,
  /^zinc$/i,
  /^omega-3$/i,
  /^calcium$/i,
];

function catalogPriority(name: string): number {
  const idx = CATALOG_PRIORITY_RE.findIndex((re) => re.test(name));
  return idx === -1 ? 100 + name.length : idx;
}

/**
 * Merge JSON-LD / offer catalog with page-mined nouns, reject tools, cap at 8.
 * Prefer form variants + core vitamins/minerals, then explorer chips.
 */
export function mergeAndScrubCatalogProducts(input: {
  jsonLdProducts: CatalogProduct[];
  corpus: CrawlCorpus;
  offerNames?: string[];
  offerSourceUrl?: string;
}): CatalogProduct[] {
  const fromOffers: CatalogProduct[] = (input.offerNames ?? []).map((name) => ({
    name,
    sourceUrl: input.offerSourceUrl ?? input.corpus.origin,
  }));

  const merged = [
    ...mineCatalogPageProducts(input.corpus),
    ...mineExplorerIngredientChips(input.corpus),
    ...input.jsonLdProducts,
    ...fromOffers,
  ];

  const byKey = new Map<string, CatalogProduct>();
  for (const p of merged) {
    if (!p.name || isRejectedCatalogName(p.name)) continue;
    const key = p.name.toLowerCase();
    if (!byKey.has(key)) byKey.set(key, p);
  }

  const ranked = [...byKey.values()].toSorted(
    (a, b) => catalogPriority(a.name) - catalogPriority(b.name)
  );
  const scrubbed = scrubCatalogProducts(ranked, MAX_CATALOG * 2);
  return enrichFormVariants(scrubbed, input.corpus);
}

/** Educational shopping topics that name catalog ingredients (no medical claims). */
export function contentOpportunitiesForCatalog(
  catalog: CatalogProduct[]
): string[] {
  const byName = (re: RegExp) =>
    catalog.find((p) => re.test(p.name))?.name;

  const topics: string[] = [];
  const mgGly = byName(/magnesium glycinate/i);
  const vitC = byName(/^vitamin c$/i);
  const vitD3 = byName(/vitamin d3/i) ?? byName(/^vitamin d$/i);
  const omega = byName(/omega-?3/i);
  const zinc = byName(/^zinc$/i);
  const b12 = byName(/vitamin b12|b12/i);

  if (mgGly) {
    topics.push(`What to check on a ${mgGly} label before buying`);
  }
  if (vitC) {
    topics.push(`${vitC} forms and price per serving across retailers`);
  }
  if (vitD3) {
    topics.push(`Comparing ${vitD3} vs D2 on supplement labels`);
  }
  if (omega) {
    topics.push(`How to compare ${omega} price per serving fairly`);
  }
  if (zinc) {
    topics.push(`${zinc} label checks: strength, form, and serving cost`);
  }
  if (b12) {
    topics.push(
      `${b12} Methylcobalamin vs Cyanocobalamin — what labels show`
    );
  }

  // Fill remaining slots from leftover catalog names
  for (const p of catalog) {
    if (topics.length >= 6) break;
    const already = topics.some((t) =>
      t.toLowerCase().includes(p.name.toLowerCase())
    );
    if (already) continue;
    topics.push(
      `How to compare ${p.name} labels and price per serving before buying`
    );
  }

  return topics.slice(0, 6);
}
