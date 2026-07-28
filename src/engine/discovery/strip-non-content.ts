import type * as cheerio from "cheerio";

type Root = ReturnType<typeof cheerio.load>;

/** Remove non-visible / non-content nodes before reading page text. */
export function stripNonContent($: Root): void {
  $("script, style, noscript, svg, iframe").remove();
}
