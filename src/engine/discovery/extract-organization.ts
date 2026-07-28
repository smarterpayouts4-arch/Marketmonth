import * as cheerio from "cheerio";

import type { CrawlCorpus, OrganizationFacts } from "./types";

export type { OrganizationFacts };

function typeList(type: unknown): string[] {
  if (Array.isArray(type)) return type.map((t) => String(t).toLowerCase());
  if (type) return [String(type).toLowerCase()];
  return [];
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function walk(
  node: unknown,
  sourceUrl: string,
  out: OrganizationFacts[]
) {
  if (!node || typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  const types = typeList(obj["@type"]);
  const isOrg = types.some(
    (t) =>
      t === "organization" ||
      t === "localbusiness" ||
      t.endsWith("/organization") ||
      t.endsWith("/localbusiness")
  );

  if (isOrg) {
    const address =
      obj.address && typeof obj.address === "object"
        ? (obj.address as Record<string, unknown>)
        : null;
    const founder =
      obj.founder && typeof obj.founder === "object"
        ? asString((obj.founder as Record<string, unknown>).name)
        : asString(obj.founder);
    const area =
      obj.areaServed && typeof obj.areaServed === "object"
        ? asString((obj.areaServed as Record<string, unknown>).name)
        : asString(obj.areaServed);

    const knowsAbout: string[] = [];
    if (Array.isArray(obj.knowsAbout)) {
      for (const k of obj.knowsAbout) {
        if (typeof k === "string" && k.trim()) knowsAbout.push(k.trim());
      }
    }

    const sameAs: string[] = [];
    if (Array.isArray(obj.sameAs)) {
      for (const s of obj.sameAs) {
        if (typeof s === "string" && s.trim()) sameAs.push(s.trim());
      }
    }

    const offerNames: string[] = [];
    const catalog = obj.hasOfferCatalog;
    if (catalog && typeof catalog === "object") {
      const items = (catalog as Record<string, unknown>).itemListElement;
      const list = Array.isArray(items) ? items : items ? [items] : [];
      for (const item of list) {
        if (!item || typeof item !== "object") continue;
        const offered = (item as Record<string, unknown>).itemOffered;
        if (offered && typeof offered === "object") {
          const name = asString((offered as Record<string, unknown>).name);
          if (name) offerNames.push(name);
        }
      }
    }

    out.push({
      name: asString(obj.name),
      legalName: asString(obj.legalName),
      description: asString(obj.description),
      email: asString(obj.email),
      telephone: asString(obj.telephone),
      foundingDate: asString(obj.foundingDate),
      founder,
      areaServed: area,
      streetAddress: address ? asString(address.streetAddress) : undefined,
      city: address ? asString(address.addressLocality) : undefined,
      region: address ? asString(address.addressRegion) : undefined,
      postalCode: address ? asString(address.postalCode) : undefined,
      country: address ? asString(address.addressCountry) : undefined,
      knowsAbout: knowsAbout.slice(0, 16),
      sameAs: sameAs.slice(0, 12),
      offerNames: offerNames.slice(0, 12),
      sourceUrl,
    });
  }

  if (Array.isArray(obj["@graph"])) {
    for (const child of obj["@graph"]) walk(child, sourceUrl, out);
  }
}

/** Organization / LocalBusiness facts from JSON-LD. */
export function extractOrganizationFacts(
  corpus: CrawlCorpus
): OrganizationFacts | null {
  const found: OrganizationFacts[] = [];
  for (const page of corpus.pages) {
    const $ = cheerio.load(page.html);
    $('script[type="application/ld+json"]').each((_, el) => {
      const raw = $(el).html();
      if (!raw) return;
      try {
        const parsed: unknown = JSON.parse(raw);
        const nodes = Array.isArray(parsed) ? parsed : [parsed];
        for (const node of nodes) walk(node, page.url, found);
      } catch {
        /* ignore */
      }
    });
    if (found.length) break;
  }
  return found[0] ?? null;
}
