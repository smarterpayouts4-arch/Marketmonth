import * as cheerio from "cheerio";

import type { CollectedPage } from "./types";

const MIN_USEFUL_TEXT = 280;

/** Return true when static HTML looks like an empty JS shell. */
export function shouldUsePlaywright(page: CollectedPage): boolean {
  if (process.env.DISCOVERY_PLAYWRIGHT === "0") return false;
  if (!page.html || page.status >= 400) return false;

  const textLen = page.text.replace(/\s+/g, " ").trim().length;
  if (textLen >= MIN_USEFUL_TEXT) return false;

  const $ = cheerio.load(page.html);
  const rootId = $("#__next, #root, #app, [data-reactroot]").length > 0;
  const scriptHeavy = $("script").length >= 8 && $("p").length < 3;
  const noscriptOnly =
    $("noscript").text().trim().length > 40 && textLen < MIN_USEFUL_TEXT;

  return rootId || scriptHeavy || noscriptOnly || textLen < 80;
}
