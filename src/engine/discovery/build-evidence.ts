import * as cheerio from "cheerio";

import { makeEvidence, type DiscoveryEvidence } from "@/lib/discovery/evidence";
import type { CrawlMeta } from "@/lib/discovery/evidence.schema";

import type { SocialProfile } from "./brand-profile";
import type { BrandSignals, CrawlCorpus } from "./types";

function clip(value: string, max = 220): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > max ? `${cleaned.slice(0, max - 1)}…` : cleaned;
}

function extractTestimonials(html: string): string[] {
  const $ = cheerio.load(html);
  const quotes: string[] = [];
  $("blockquote, [class*='testimonial'], [class*='review']").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text.length > 40 && text.length < 400) quotes.push(text);
  });
  return quotes.slice(0, 4);
}

function extractCtas(html: string): string[] {
  const $ = cheerio.load(html);
  const ctas: string[] = [];
  $("a, button").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (
      text.length > 2 &&
      text.length < 60 &&
      /(start|try|get|find|compare|shop|explore|learn|book|join|sign)/i.test(
        text
      )
    ) {
      ctas.push(text);
    }
  });
  return [...new Set(ctas)].slice(0, 6);
}

export function buildCrawlMeta(
  corpus: CrawlCorpus,
  extras?: { detectedLocations?: CrawlMeta["detectedLocations"] }
): CrawlMeta {
  return {
    pageCount: corpus.pages.length,
    kinds: corpus.pages.map((p) => p.kind),
    collectionMethods: [
      ...new Set(
        corpus.pages.map((p) => p.collectionMethod ?? ("fetch" as const))
      ),
    ],
    pageSummaries: corpus.pages.map((p) => ({
      url: p.url,
      pageType: p.kind,
      title: p.title,
      collectionMethod: p.collectionMethod ?? "fetch",
    })),
    detectedLocations: extras?.detectedLocations,
  };
}

/** Marketing-focused evidence from crawled pages (no SEO/analytics claims). */
export function buildDiscoveryEvidence(input: {
  corpus: CrawlCorpus;
  signals: BrandSignals;
  social: SocialProfile[];
}): DiscoveryEvidence[] {
  const { corpus, signals, social } = input;
  const evidence: DiscoveryEvidence[] = [];
  const home = corpus.pages.find((p) => p.kind === "home") ?? corpus.pages[0];

  if (signals.title) {
    evidence.push(
      makeEvidence({
        field: "businessName",
        kind: "observed",
        value: signals.title,
        sourceUrl: home.url,
        sourcePageType: home.kind,
        confidence: "high",
      })
    );
  }

  if (signals.metaDescription) {
    evidence.push(
      makeEvidence({
        field: "description",
        kind: "observed",
        value: signals.metaDescription,
        sourceUrl: home.url,
        sourcePageType: home.kind,
      })
    );
  }

  if (signals.logoUrl) {
    evidence.push(
      makeEvidence({
        field: "logoUrl",
        kind: "observed",
        value: signals.logoUrl,
        sourceUrl: home.url,
        sourcePageType: home.kind,
        confidence: "high",
      })
    );
  }

  for (const email of signals.contactEmails.slice(0, 5)) {
    evidence.push(
      makeEvidence({
        field: "contactEmail",
        kind: "observed",
        value: email,
        sourceUrl: home.url,
        sourcePageType: "contact",
        confidence: "high",
      })
    );
  }

  for (const phone of signals.contactPhones.slice(0, 5)) {
    evidence.push(
      makeEvidence({
        field: "contactPhone",
        kind: "observed",
        value: phone,
        sourceUrl: home.url,
        sourcePageType: "contact",
        confidence: "medium",
      })
    );
  }

  const org = signals.organization;
  if (org) {
    const orgUrl = org.sourceUrl || home.url;
    if (org.legalName) {
      evidence.push(
        makeEvidence({
          field: "legalName",
          kind: "observed",
          value: org.legalName,
          sourceUrl: orgUrl,
          sourcePageType: "organization",
          confidence: "high",
        })
      );
    }
    if (org.founder) {
      evidence.push(
        makeEvidence({
          field: "founder",
          kind: "observed",
          value: org.founder,
          sourceUrl: orgUrl,
          sourcePageType: "organization",
          confidence: "high",
        })
      );
    }
    if (org.foundingDate) {
      evidence.push(
        makeEvidence({
          field: "foundingDate",
          kind: "observed",
          value: org.foundingDate,
          sourceUrl: orgUrl,
          sourcePageType: "organization",
          confidence: "high",
        })
      );
    }
    if (org.description) {
      evidence.push(
        makeEvidence({
          field: "organizationDescription",
          kind: "observed",
          value: clip(org.description, 320),
          sourceUrl: orgUrl,
          sourcePageType: "organization",
          confidence: "high",
        })
      );
    }
    if (org.areaServed) {
      evidence.push(
        makeEvidence({
          field: "serviceArea",
          kind: "observed",
          value: org.areaServed,
          sourceUrl: orgUrl,
          sourcePageType: "organization",
          confidence: "high",
        })
      );
    }
    const addressParts = [
      org.streetAddress,
      [org.city, org.region, org.postalCode].filter(Boolean).join(", "),
      org.country,
    ].filter(Boolean);
    if (addressParts.length) {
      evidence.push(
        makeEvidence({
          field: "businessAddress",
          kind: "observed",
          value: addressParts.join(" · "),
          sourceUrl: orgUrl,
          sourcePageType: "organization",
          confidence: "high",
        })
      );
    }
    if (org.knowsAbout.length) {
      evidence.push(
        makeEvidence({
          field: "knowsAbout",
          kind: "observed",
          value: org.knowsAbout.slice(0, 12).join(" · "),
          sourceUrl: orgUrl,
          sourcePageType: "organization",
          confidence: "high",
        })
      );
    }
  }

  const offerSource =
    corpus.pages.find((p) => p.kind === "products") ?? home;
  if (signals.productText) {
    evidence.push(
      makeEvidence({
        field: "productsServices",
        kind: "observed",
        value: clip(signals.productText, 280),
        sourceUrl: offerSource.url,
        sourcePageType: offerSource.kind,
      })
    );
  }

  for (const product of signals.catalogProducts.slice(0, 16)) {
    const value = product.price
      ? `${product.name} (${product.price})`
      : product.name;
    evidence.push(
      makeEvidence({
        field: "catalogProduct",
        kind: "observed",
        value: clip(value, 160),
        sourceUrl: product.sourceUrl,
        sourcePageType: "products",
        confidence: "high",
      })
    );
  }

  const aboutSource = corpus.pages.find((p) => p.kind === "about") ?? home;
  if (signals.aboutText) {
    evidence.push(
      makeEvidence({
        field: "positioning",
        kind: "observed",
        value: clip(signals.aboutText, 280),
        sourceUrl: aboutSource.url,
        sourcePageType: aboutSource.kind,
      })
    );
  }

  if (signals.faqText) {
    const faqPage = corpus.pages.find((p) => p.kind === "faq");
    evidence.push(
      makeEvidence({
        field: "customerProblems",
        kind: "observed",
        value: clip(signals.faqText, 280),
        sourceUrl: faqPage?.url ?? home.url,
        sourcePageType: faqPage?.kind ?? "faq",
      })
    );
  }

  for (const faq of signals.faqs.slice(0, 8)) {
    evidence.push(
      makeEvidence({
        field: "faq",
        kind: "observed",
        value: clip(`Q: ${faq.question} A: ${faq.answer}`, 500),
        sourceUrl: faq.sourceUrl ?? home.url,
        sourcePageType: "faq",
        confidence: "high",
      })
    );
  }

  if (signals.headings.length) {
    evidence.push(
      makeEvidence({
        field: "educationalTopics",
        kind: "observed",
        value: signals.headings.slice(0, 8).join(" · "),
        sourceUrl: home.url,
        sourcePageType: home.kind,
      })
    );
  }

  for (const page of corpus.pages) {
    for (const quote of extractTestimonials(page.html)) {
      evidence.push(
        makeEvidence({
          field: "websiteTestimonial",
          kind: "observed",
          value: clip(quote, 240),
          sourceUrl: page.url,
          sourcePageType: page.kind,
          confidence: "medium",
        })
      );
    }
  }

  // Prefer structured CTAs from signals; fall back to per-page scrape
  const ctaSource =
    signals.ctaTexts.length > 0
      ? signals.ctaTexts
      : corpus.pages.flatMap((p) => extractCtas(p.html));
  for (const cta of [...new Set(ctaSource)].slice(0, 8)) {
    evidence.push(
      makeEvidence({
        field: "websiteCta",
        kind: "observed",
        value: cta,
        sourceUrl: home.url,
        sourcePageType: home.kind,
        confidence: "medium",
      })
    );
  }

  if (signals.locationHints.length) {
    evidence.push(
      makeEvidence({
        field: "serviceArea",
        kind: "observed",
        value: signals.locationHints.slice(0, 4).join(", "),
        sourceUrl: home.url,
        sourcePageType: home.kind,
        confidence: "medium",
      })
    );
  }

  for (const profile of social.filter((s) => s.status === "present" && s.url)) {
    evidence.push(
      makeEvidence({
        field: `social.${profile.platform}`,
        kind: "observed",
        value: profile.url!,
        sourceUrl: profile.url,
        sourcePageType: "social_link",
        confidence: "high",
      })
    );
  }

  if (signals.blogText) {
    const blogPage = corpus.pages.find((p) => p.kind === "blog");
    evidence.push(
      makeEvidence({
        field: "ownedTopics",
        kind: "observed",
        value: clip(signals.blogText, 240),
        sourceUrl: blogPage?.url ?? home.url,
        sourcePageType: blogPage?.kind ?? "blog",
        confidence: "medium",
      })
    );
  }

  // Deduplicate by field+value prefix
  const seen = new Set<string>();
  return evidence.filter((item) => {
    const key = `${item.field}:${item.value.slice(0, 80)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
