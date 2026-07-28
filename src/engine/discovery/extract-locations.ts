import * as cheerio from "cheerio";

import type { DetectedLocation } from "@/lib/discovery/location.schema";

import type { CrawlCorpus } from "./types";

function pushUnique(list: DetectedLocation[], next: DetectedLocation) {
  const key = [
    next.formattedAddress,
    next.city,
    next.region,
    next.country,
    next.sourceUrl,
  ]
    .filter(Boolean)
    .join("|")
    .toLowerCase();
  if (!key || list.some((l) => {
    const existing = [
      l.formattedAddress,
      l.city,
      l.region,
      l.country,
      l.sourceUrl,
    ]
      .filter(Boolean)
      .join("|")
      .toLowerCase();
    return existing === key;
  })) {
    return;
  }
  list.push(next);
}

function fromPostalAddress(
  address: Record<string, unknown>,
  sourceUrl: string,
  confidence: DetectedLocation["confidence"]
): DetectedLocation | null {
  const street = String(address.streetAddress ?? "").trim();
  const city = String(address.addressLocality ?? "").trim() || undefined;
  const region = String(address.addressRegion ?? "").trim() || undefined;
  const country = String(address.addressCountry ?? "").trim() || undefined;
  const postal = String(address.postalCode ?? "").trim();
  const formatted = [street, city, region, postal, country]
    .filter(Boolean)
    .join(", ");
  if (!formatted && !city && !region) return null;
  return {
    formattedAddress: formatted || undefined,
    city,
    region,
    country: typeof country === "string" ? country : undefined,
    sourceUrl,
    confidence,
  };
}

function parseJsonLd(html: string, sourceUrl: string): DetectedLocation[] {
  const $ = cheerio.load(html);
  const found: DetectedLocation[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).text().trim();
    if (!raw) return;
    try {
      const data = JSON.parse(raw) as unknown;
      const nodes = Array.isArray(data)
        ? data
        : data && typeof data === "object" && "@graph" in data
          ? (data as { "@graph": unknown[] })["@graph"]
          : [data];

      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;
        const obj = node as Record<string, unknown>;
        const type = String(obj["@type"] ?? "");
        if (
          !/LocalBusiness|Organization|Place|Store|Corporation/i.test(type)
        ) {
          continue;
        }
        const address = obj.address;
        if (address && typeof address === "object") {
          const loc = fromPostalAddress(
            address as Record<string, unknown>,
            sourceUrl,
            "high"
          );
          if (loc) pushUnique(found, loc);
        }
      }
    } catch {
      /* ignore invalid JSON-LD */
    }
  });

  return found;
}

function fromAddressElements(
  html: string,
  sourceUrl: string
): DetectedLocation[] {
  const $ = cheerio.load(html);
  const found: DetectedLocation[] = [];
  $("address").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text.length < 8 || text.length > 160) return;
    pushUnique(found, {
      formattedAddress: text,
      sourceUrl,
      confidence: "medium",
    });
  });
  return found;
}

function fromMapsLinks(html: string, sourceUrl: string): DetectedLocation[] {
  const $ = cheerio.load(html);
  const found: DetectedLocation[] = [];
  $('a[href*="google.com/maps"], a[href*="maps.google"], a[href*="goo.gl/maps"]').each(
    (_, el) => {
      const text = $(el).text().replace(/\s+/g, " ").trim();
      if (text.length > 4 && text.length < 120) {
        pushUnique(found, {
          formattedAddress: text,
          sourceUrl,
          confidence: "medium",
        });
      }
    }
  );
  return found;
}

const SERVICE_AREA_RE =
  /\b(?:serving|based in|located in|we serve)\s+([A-Z][A-Za-z.\-\s,]{2,48})/g;

function fromServiceAreaText(
  html: string,
  sourceUrl: string
): DetectedLocation[] {
  const $ = cheerio.load(html);
  $("script, style, noscript").remove();
  const blob = $("footer, main, body").text().replace(/\s+/g, " ");
  const found: DetectedLocation[] = [];
  for (const match of blob.matchAll(SERVICE_AREA_RE)) {
    const phrase = match[1]?.trim().replace(/[.,;]+$/, "");
    if (!phrase || phrase.length < 3) continue;
    const parts = phrase.split(",").map((p) => p.trim());
    pushUnique(found, {
      formattedAddress: phrase.slice(0, 80),
      city: parts[0] || undefined,
      region: parts[1] || undefined,
      sourceUrl,
      confidence: "low",
    });
  }
  return found;
}

/** Extract grounded location candidates only — never invent fields. */
export function extractLocations(corpus: CrawlCorpus): DetectedLocation[] {
  const results: DetectedLocation[] = [];
  const priority = ["contact", "home", "about", "other"] as const;

  const pages = [...corpus.pages].sort((a, b) => {
    const ai = priority.indexOf(a.kind as (typeof priority)[number]);
    const bi = priority.indexOf(b.kind as (typeof priority)[number]);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  for (const page of pages) {
    for (const loc of parseJsonLd(page.html, page.url)) {
      pushUnique(results, loc);
    }
  }
  for (const page of pages) {
    for (const loc of fromAddressElements(page.html, page.url)) {
      pushUnique(results, loc);
    }
    for (const loc of fromMapsLinks(page.html, page.url)) {
      pushUnique(results, loc);
    }
  }
  if (results.filter((r) => r.confidence === "high").length === 0) {
    for (const page of pages) {
      for (const loc of fromServiceAreaText(page.html, page.url)) {
        pushUnique(results, loc);
      }
    }
  }

  return results.slice(0, 8);
}
