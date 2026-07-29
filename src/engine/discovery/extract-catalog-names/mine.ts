import * as cheerio from "cheerio";

import { stripNonContent } from "../strip-non-content";
import type { IndexedProduct, CrawlCorpus } from "../types";

import {
  cleanCatalogHeading,
  MINERAL_HEAD_RE,
  normalizeIngredientName,
  OTHER_INGREDIENT_HEAD_RE,
} from "./normalize-heading";
import { siteSupportsSupplementBoost } from "./priority";
import { isRejectedCatalogName } from "./reject";

export function loadClean(html: string) {
  const $ = cheerio.load(html);
  stripNonContent($);
  return $;
}

function corpusTextBlob(corpus: CrawlCorpus): string {
  return corpus.pages
    .map((p) => `${p.url}\n${p.title ?? ""}\n${p.html}`)
    .join("\n");
}

/** Mine catalog nouns from products/catalog pages (industry-agnostic). */
export function mineCatalogPageProducts(corpus: CrawlCorpus): IndexedProduct[] {
  const out: IndexedProduct[] = [];
  const seen = new Set<string>();

  for (const page of corpus.pages) {
    if (page.kind !== "products" && !/catalog|services|products/i.test(page.url)) {
      continue;
    }
    const $ = loadClean(page.html);
    $("h1, h2, h3, h4, a, li, [class*='product'], [class*='ingredient'], [class*='service']").each(
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
  /\b(Magnesium|Vitamin\s+D\d*|Vitamin\s+C|Omega-?\s*3|Ashwagandha|Probiotics|B12|Zinc|Calcium|Creatine|Collagen|Lion'?s\s+Mane)\b/gi;

/**
 * Chip / suggestion nouns from explorer-style pages.
 * Supplement chip regex is a boost only when the site already uses that vocabulary.
 */
export function mineExplorerIngredientChips(
  corpus: CrawlCorpus
): IndexedProduct[] {
  const out: IndexedProduct[] = [];
  const seen = new Set<string>();
  const enableSupplementChips = siteSupportsSupplementBoost(
    corpusTextBlob(corpus)
  );

  for (const page of corpus.pages) {
    if (!/ingredient|explorer|tools|catalog|services/i.test(page.url)) continue;
    const $ = loadClean(page.html);
    $("a, button, [role='button'], li, span").each((_, el) => {
      const raw = $(el).text().replace(/\s+/g, " ").trim();
      if (raw.length < 2 || raw.length > 40) return;
      if (/\s{2,}/.test(raw) || raw.split(/\s+/).length > 4) return;
      const name =
        cleanCatalogHeading(raw) ??
        (enableSupplementChips &&
        (OTHER_INGREDIENT_HEAD_RE.test(raw) || MINERAL_HEAD_RE.test(raw))
          ? normalizeIngredientName(raw)
          : null);
      if (!name || isRejectedCatalogName(name)) return;
      const key = name.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ name, sourceUrl: page.url });
    });

    if (!enableSupplementChips) continue;

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
