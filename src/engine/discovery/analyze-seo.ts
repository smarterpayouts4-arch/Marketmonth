import * as cheerio from "cheerio";

import type { SeoSummary } from "./brand-profile";
import type { CrawlCorpus } from "./types";

export function analyzeSeo(corpus: CrawlCorpus): SeoSummary {
  const home = corpus.pages.find((p) => p.kind === "home") ?? corpus.pages[0];
  const $ = cheerio.load(home.html);
  const htmlBytes = new TextEncoder().encode(home.html).length;

  const hasTitle = Boolean($("title").text().trim());
  const hasDescription = Boolean(
    $('meta[name="description"]').attr("content")?.trim()
  );
  const hasCanonical = Boolean($('link[rel="canonical"]').attr("href"));
  const hasOg = Boolean($('meta[property="og:title"]').attr("content"));
  const h1Count = $("h1").length;
  const images = $("img");
  let missingAlt = 0;
  images.each((_, el) => {
    if (!$(el).attr("alt")?.trim()) missingAlt += 1;
  });

  const scoreBits = [hasTitle, hasDescription, hasCanonical, hasOg, h1Count === 1];
  const metaScore = scoreBits.filter(Boolean).length;
  const metadataCompleteness =
    metaScore >= 4 ? "strong" : metaScore >= 2 ? "partial" : "weak";

  const technicalObservations: string[] = [];
  if (!hasTitle) technicalObservations.push("Missing document title.");
  if (!hasDescription) technicalObservations.push("Missing meta description.");
  if (h1Count === 0) technicalObservations.push("No H1 heading found on the homepage.");
  if (h1Count > 1) technicalObservations.push(`Multiple H1 headings (${h1Count}).`);
  if (missingAlt > 0) {
    technicalObservations.push(`${missingAlt} images missing alt text.`);
  }
  if (htmlBytes > 500_000) {
    technicalObservations.push("Large HTML payload may slow first paint.");
  }
  if (technicalObservations.length === 0) {
    technicalObservations.push("Core on-page metadata looks in reasonable shape.");
  }

  const contentOpportunities: string[] = [];
  if (!corpus.pages.some((p) => p.kind === "about")) {
    contentOpportunities.push("Add or surface a clear About page for brand story.");
  }
  if (!corpus.pages.some((p) => p.kind === "faq")) {
    contentOpportunities.push("Publish FAQs to capture long-tail search intent.");
  }
  if (!hasDescription) {
    contentOpportunities.push("Write a benefit-led meta description for the homepage.");
  }
  if (contentOpportunities.length === 0) {
    contentOpportunities.push("Expand educational content around top products/services.");
  }

  const kb = Math.round(htmlBytes / 1024);
  const pageSpeedNote = `Heuristic only (not Lighthouse): homepage HTML ~${kb}KB with ${images.length} images.`;

  return {
    metadataCompleteness,
    pageSpeedNote,
    technicalObservations,
    contentOpportunities,
  };
}
