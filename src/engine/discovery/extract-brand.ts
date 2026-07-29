import * as cheerio from "cheerio";

import { extractContactPhones } from "./extract-contact";
import { mergeAndScrubIndexedProducts } from "./extract-catalog-names";
import { extractFaqs } from "./extract-faq";
import { extractOrganizationFacts } from "./extract-organization";
import { extractIndexedProducts } from "./extract-product-jsonld";
import { mainContentText } from "@/lib/discovery/html-clean";

import { stripNonContent } from "./strip-non-content";
import type { BrandSignals, CrawlCorpus } from "./types";

/** Drop concatenated JSON-LD blobs that leaked into visible text. */
function stripJsonLdBlobs(text: string): string {
  if (!/"@context"/i.test(text) && !/schema\.org/i.test(text)) return text;
  const cleaned = text
    .replace(/\{\s*"@context"[\s\S]*?(?=\{\s*"@context"|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // If the field was almost entirely schema noise, drop it
  if (cleaned.length < 40 && /schema\.org|@type/i.test(text)) return "";
  return cleaned;
}

type Root = ReturnType<typeof cheerio.load>;

const HEX_COLOR = /#(?:[0-9a-fA-F]{3}){1,2}\b/g;
const LOCATION_RE =
  /\b(?:serving|based in|located in|across|nationwide|worldwide)\s+[A-Z][A-Za-z\s,]{2,40}/g;

function loadClean(html: string): Root {
  const $ = cheerio.load(html);
  stripNonContent($);
  return $;
}

function textOf($: Root, selector: string, limit = 4000): string {
  const nodes = $(selector).toArray();
  return nodes
    .map((el) => $(el).text().replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ")
    .slice(0, limit);
}

function pageText(html: string, limit = 3500): string {
  return mainContentText(html, limit);
}

export function extractBrandSignals(corpus: CrawlCorpus): BrandSignals {
  const home = corpus.pages.find((p) => p.kind === "home") ?? corpus.pages[0];
  const $home = loadClean(home.html);
  // Meta/title read from a fresh parse (stripNonContent removes nothing critical there,
  // but keep attributes available from original for logo/meta).
  const $meta = cheerio.load(home.html);

  const title =
    $meta("title").first().text().trim() ||
    $meta('meta[property="og:site_name"]').attr("content")?.trim() ||
    home.title?.trim() ||
    corpus.origin;

  const metaDescription =
    $meta('meta[name="description"]').attr("content")?.trim() ||
    $meta('meta[property="og:description"]').attr("content")?.trim() ||
    "";

  const headings = $home("h1, h2")
    .map((_, el) => $home(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter(Boolean)
    .slice(0, 24);

  const colors = new Set<string>();
  const styleBlob = [
    $meta("style").text(),
    $meta("[style]")
      .map((_, el) => $meta(el).attr("style") ?? "")
      .get()
      .join(" "),
  ].join(" ");
  for (const match of styleBlob.match(HEX_COLOR) ?? []) {
    colors.add(match.toLowerCase());
    if (colors.size >= 8) break;
  }

  const logoUrl =
    $meta('link[rel="icon"]').attr("href") ||
    $meta('meta[property="og:image"]').attr("content") ||
    $meta("img[alt*='logo' i], img[src*='logo' i]").first().attr("src") ||
    undefined;

  const resolvedLogo = logoUrl
    ? new URL(logoUrl, home.url).toString()
    : undefined;

  const contactEmails = new Set<string>();
  const emailRe = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24}\b/g;
  const isPlausibleEmail = (email: string): boolean => {
    if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,10}$/i.test(email)) return false;
    if (/example\.com|sentry|wixpress|cloudflare/i.test(email)) return false;
    const tld = email.split(".").pop() ?? "";
    // Reject glued cleanedText artifacts: business@zynava.commonday
    if (/phone|support|monday|contact|home|about/i.test(tld)) return false;
    return true;
  };
  for (const page of corpus.pages) {
    for (const email of page.html.match(emailRe) ?? []) {
      if (isPlausibleEmail(email)) contactEmails.add(email.toLowerCase());
      if (contactEmails.size >= 5) break;
    }
  }
  // organization emails filled after org extract below

  const aboutPage = corpus.pages.find((p) => p.kind === "about");
  const productsPage = corpus.pages.find((p) => p.kind === "products");
  const faqPage = corpus.pages.find((p) => p.kind === "faq");
  const testimonialsPage = corpus.pages.find((p) => p.kind === "testimonials");
  const blogPage = corpus.pages.find((p) => p.kind === "blog");

  const aboutText = stripJsonLdBlobs(
    aboutPage
      ? pageText(aboutPage.html, 3500)
      : textOf($home, "main, article, body", 2000)
  );

  const productText = stripJsonLdBlobs(
    productsPage
      ? pageText(productsPage.html, 3500)
      : textOf($home, "[class*='product'], [id*='product']", 2000)
  );

  const faqText = stripJsonLdBlobs(
    faqPage ? pageText(faqPage.html, 2500) : ""
  );
  const faqs = extractFaqs(corpus);
  const jsonLdCatalog = extractIndexedProducts(corpus);
  const organization = extractOrganizationFacts(corpus);
  const contactPhones = [
    ...extractContactPhones(corpus),
    ...(organization?.telephone ? [organization.telephone] : []),
  ];
  const uniquePhones = [...new Set(contactPhones)].slice(0, 5);
  const testimonialText = stripJsonLdBlobs(
    testimonialsPage
      ? pageText(testimonialsPage.html, 2500)
      : textOf($home, "blockquote, [class*='testimonial']", 1500)
  );
  const blogText = stripJsonLdBlobs(
    blogPage ? pageText(blogPage.html, 2500) : ""
  );

  const bodySample = stripJsonLdBlobs(
    textOf($home, "main p, article p, body p", 2500)
  );

  const ctaTexts: string[] = [];
  $home("a, button").each((_, el) => {
    const text = $home(el).text().replace(/\s+/g, " ").trim();
    if (
      text.length > 2 &&
      text.length < 60 &&
      /(start|try|get|find|compare|shop|explore|learn|book|join)/i.test(text)
    ) {
      ctaTexts.push(text);
    }
  });

  const productLines: string[] = [];
  if (productsPage) {
    const $p = loadClean(productsPage.html);
    $p("h1, h2, h3, li, [class*='product']").each((_, el) => {
      const t = $p(el).text().replace(/\s+/g, " ").trim();
      if (t.length > 4 && t.length < 80 && !/@context|schema\.org/i.test(t)) {
        productLines.push(t);
      }
    });
  }

  const locationHints = new Set<string>();
  const blob = [aboutText, bodySample, metaDescription].join(" ");
  for (const match of blob.match(LOCATION_RE) ?? []) {
    locationHints.add(match.replace(/\s+/g, " ").trim());
  }

  if (organization?.email) {
    contactEmails.add(organization.email.toLowerCase());
  }

  const indexedProducts = mergeAndScrubIndexedProducts({
    jsonLdProducts: jsonLdCatalog,
    corpus,
    offerNames: organization?.offerNames,
    offerSourceUrl: organization?.sourceUrl,
  });

  const catalogNames = indexedProducts.map((p) => p.name);
  const enrichedProductText = [
    productText,
    ...productLines.slice(0, 12),
    ...catalogNames.slice(0, 12),
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 4000);

  return {
    title,
    metaDescription,
    headings,
    colors: [...colors],
    logoUrl: resolvedLogo,
    contactEmails: [...contactEmails].slice(0, 5),
    contactPhones: uniquePhones,
    aboutText,
    productText: enrichedProductText,
    faqText,
    faqs,
    indexedProducts,
    organization,
    bodySample,
    testimonialText,
    blogText,
    ctaTexts: [...new Set(ctaTexts)].slice(0, 8),
    locationHints: [...locationHints].slice(0, 6),
  };
}
