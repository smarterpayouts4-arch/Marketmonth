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

/**
 * Elements that end a line of visible text. Inline tags are deliberately absent
 * so phrases containing links or emphasis are not broken apart.
 */
const BLOCK_SELECTORS = [
  "address",
  "article",
  "aside",
  "blockquote",
  "br",
  "dd",
  "details",
  "div",
  "dl",
  "dt",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "legend",
  "li",
  "main",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "summary",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "ul",
].join(", ");

/** Remove non-visible / chrome nodes before reading page text. */
export function stripNonContent($: Root): void {
  $(BOILERPLATE_SELECTORS).remove();
}

/**
 * Cheerio's `.text()` concatenates adjacent block text with no separator, so
 * `<h1>About ZYNAVA</h1><h2>Why ZYNAVA Exists</h2>` collapsed into
 * "About ZYNAVAWhy ZYNAVA Exists" and surfaced glued on the Discovery card.
 * Marking block boundaries first keeps those lines distinct.
 */
function markBlockBoundaries($: Root): void {
  $(BLOCK_SELECTORS).each((_, el) => {
    $(el).after("\n");
  });
}

/**
 * Prefer landmark main content; fall back to body after chrome strip.
 * Shared by fetchers, snapshots, and brand extraction.
 * Newlines are preserved as line boundaries; spaces within a line collapse.
 */
export function mainContentText(html: string, limit = 120_000): string {
  const $ = cheerio.load(html);
  stripNonContent($);
  markBlockBoundaries($);
  const main = $("main, article, [role=main]").first();
  const raw = (
    main.length > 0 ? main.text() : $("body").text() || $.root().text()
  )
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
  return raw.slice(0, limit);
}
