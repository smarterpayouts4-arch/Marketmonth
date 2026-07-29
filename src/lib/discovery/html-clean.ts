import * as cheerio from "cheerio";

type Root = ReturnType<typeof cheerio.load>;

const BOILERPLATE_SELECTORS = [
  "script",
  "style",
  "noscript",
  "svg",
  "iframe",
  "nav",
  "header",
  "footer",
  "aside",
  "[role=navigation]",
  "[role=banner]",
  "[role=contentinfo]",
  "[role=complementary]",
].join(", ");

/** Remove non-visible / chrome nodes before reading page text. */
export function stripNonContent($: Root): void {
  $(BOILERPLATE_SELECTORS).remove();
}

/**
 * Prefer landmark main content; fall back to body after chrome strip.
 * Shared by fetchers, snapshots, and brand extraction.
 */
export function mainContentText(html: string, limit = 120_000): string {
  const $ = cheerio.load(html);
  stripNonContent($);
  const main = $("main, article, [role=main]").first();
  const raw = (
    main.length > 0 ? main.text() : $("body").text() || $.root().text()
  )
    .replace(/\s+/g, " ")
    .trim();
  return raw.slice(0, limit);
}
