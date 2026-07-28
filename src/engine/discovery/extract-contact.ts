import * as cheerio from "cheerio";

import type { CrawlCorpus } from "./types";

const MAX_PHONES = 5;

/** Loose phone patterns + tel: hrefs; filters obvious non-numbers. */
const PHONE_RE =
  /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)\d{3,4}[\s.-]?\d{3,4}/g;

function normalizePhone(raw: string): string | null {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  // Skip years / zip-like fragments that snuck in
  if (/^20\d{2}$/.test(digits)) return null;
  return cleaned.slice(0, 40);
}

/** Collect contact phones from tel: links and page text (contact/home first). */
export function extractContactPhones(corpus: CrawlCorpus): string[] {
  const found = new Set<string>();
  const pages = [
    ...corpus.pages.filter((p) => p.kind === "contact"),
    ...corpus.pages.filter((p) => p.kind === "home"),
    ...corpus.pages.filter((p) => p.kind !== "contact" && p.kind !== "home"),
  ];

  for (const page of pages) {
    if (found.size >= MAX_PHONES) break;
    const $ = cheerio.load(page.html);
    $("a[href^='tel:']").each((_, el) => {
      if (found.size >= MAX_PHONES) return;
      const href = $(el).attr("href") ?? "";
      const raw = href.replace(/^tel:/i, "").replace(/[^\d+()\s.-]/g, "");
      const phone = normalizePhone(raw);
      if (phone) found.add(phone);
    });

    const text = $.root().text();
    for (const match of text.match(PHONE_RE) ?? []) {
      if (found.size >= MAX_PHONES) break;
      const phone = normalizePhone(match);
      if (phone) found.add(phone);
    }
  }

  return [...found].slice(0, MAX_PHONES);
}
