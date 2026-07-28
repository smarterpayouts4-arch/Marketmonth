import * as cheerio from "cheerio";

import type { CatalogProduct, CrawlCorpus } from "./types";

export type { CatalogProduct };

const MAX_PRODUCTS = 24;
const MAX_NAME = 120;

function cleanName(raw: string): string | null {
  const name = raw.replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
  if (name.length < 2) return null;
  if (/^https?:\/\//i.test(name) || /@context|schema\.org/i.test(name)) {
    return null;
  }
  return name;
}

function typeList(type: unknown): string[] {
  if (Array.isArray(type)) return type.map((t) => String(t).toLowerCase());
  if (type) return [String(type).toLowerCase()];
  return [];
}

function priceFromOffers(offers: unknown): string | undefined {
  if (!offers) return undefined;
  const list = Array.isArray(offers) ? offers : [offers];
  for (const offer of list) {
    if (!offer || typeof offer !== "object") continue;
    const o = offer as Record<string, unknown>;
    if (typeof o.price === "string" || typeof o.price === "number") {
      const currency =
        typeof o.priceCurrency === "string" ? o.priceCurrency : "";
      return `${currency ? `${currency} ` : ""}${o.price}`.trim();
    }
    if (typeof o.lowPrice === "string" || typeof o.lowPrice === "number") {
      return String(o.lowPrice);
    }
  }
  return undefined;
}

function pushProduct(
  out: CatalogProduct[],
  seen: Set<string>,
  nameRaw: string,
  sourceUrl: string,
  price?: string
) {
  const name = cleanName(nameRaw);
  if (!name || out.length >= MAX_PRODUCTS) return;
  const key = name.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  out.push({ name, price, sourceUrl });
}

function walkJsonLd(
  node: unknown,
  sourceUrl: string,
  out: CatalogProduct[],
  seen: Set<string>
) {
  if (!node || typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  const types = typeList(obj["@type"]);
  const isProduct = types.some(
    (t) => t === "product" || t.endsWith("/product")
  );
  const isOffer = types.some((t) => t === "offer" || t.endsWith("/offer"));

  if (isProduct) {
    const nameRaw = typeof obj.name === "string" ? obj.name : "";
    pushProduct(
      out,
      seen,
      nameRaw,
      sourceUrl,
      priceFromOffers(obj.offers)
    );
  } else if (isOffer) {
    let nameRaw = typeof obj.name === "string" ? obj.name : "";
    if (
      !nameRaw &&
      obj.itemOffered &&
      typeof obj.itemOffered === "object" &&
      typeof (obj.itemOffered as Record<string, unknown>).name === "string"
    ) {
      nameRaw = String((obj.itemOffered as Record<string, unknown>).name);
    }
    pushProduct(out, seen, nameRaw, sourceUrl, priceFromOffers(obj));
  }

  if (Array.isArray(obj["@graph"])) {
    for (const child of obj["@graph"]) {
      walkJsonLd(child, sourceUrl, out, seen);
    }
  }

  // ItemList / hasVariant style nesting (one level of arrays of objects)
  for (const key of ["itemListElement", "hasVariant", "isRelatedTo"] as const) {
    const nest = obj[key];
    if (!Array.isArray(nest)) continue;
    for (const child of nest) {
      if (child && typeof child === "object") {
        const item = child as Record<string, unknown>;
        if (item.item) walkJsonLd(item.item, sourceUrl, out, seen);
        else walkJsonLd(child, sourceUrl, out, seen);
      }
    }
  }
}

/** Structured Product / Offer names from JSON-LD on crawled pages. */
export function extractCatalogProducts(corpus: CrawlCorpus): CatalogProduct[] {
  const out: CatalogProduct[] = [];
  const seen = new Set<string>();
  const pages = [
    ...corpus.pages.filter((p) => p.kind === "products"),
    ...corpus.pages.filter((p) => p.kind !== "products"),
  ];

  for (const page of pages) {
    if (out.length >= MAX_PRODUCTS) break;
    const $ = cheerio.load(page.html);
    $('script[type="application/ld+json"]').each((_, el) => {
      if (out.length >= MAX_PRODUCTS) return;
      const raw = $(el).html();
      if (!raw) return;
      try {
        const parsed: unknown = JSON.parse(raw);
        const nodes = Array.isArray(parsed) ? parsed : [parsed];
        for (const node of nodes) {
          walkJsonLd(node, page.url, out, seen);
        }
      } catch {
        /* ignore invalid JSON-LD */
      }
    });
  }

  return out.slice(0, MAX_PRODUCTS);
}
