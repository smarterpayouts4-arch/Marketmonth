import * as cheerio from "cheerio";

import type { CrawlCorpus, FaqEntry } from "./types";

const MAX_FAQS = 12;
const MAX_Q = 160;
const MAX_A = 400;
const MIN_Q = 10;
const MIN_A = 12;

const NEXT_Q_RE =
  /(?:What|Why|How|When|Where|Who|Do|Does|Is|Are|Can)\b[^?]{2,140}\?/i;

function clean(text: string, max: number): string {
  return text.replace(/\s+/g, " ").trim().slice(0, max);
}

function isContaminatedQuestion(q: string): boolean {
  if (!q.endsWith("?")) return true;
  // Embedded next question inside the same string
  const rest = q.slice(0, -1);
  if (NEXT_Q_RE.test(rest)) return true;
  if (/how we work\.|contact more|how it workscontact/i.test(q)) return true;
  return false;
}

function isContaminatedAnswer(a: string, q: string): boolean {
  if (a === q) return true;
  if (NEXT_Q_RE.test(a) && a.length > 80) {
    // Allow short answers that mention a related Q once at the end
    const firstQ = a.search(NEXT_Q_RE);
    if (firstQ >= 0 && firstQ < a.length * 0.5) return true;
  }
  if (/How It WorksContact/i.test(a)) return true;
  return false;
}

function pushUnique(
  out: FaqEntry[],
  seen: Set<string>,
  question: string,
  answer: string,
  sourceUrl?: string
) {
  const q = clean(question, MAX_Q);
  const a = clean(answer, MAX_A);
  if (q.length < MIN_Q || a.length < MIN_A) return;
  if (isContaminatedQuestion(q)) return;
  if (isContaminatedAnswer(a, q)) return;
  if (
    !/\?$/.test(q) &&
    !/^(what|why|how|when|where|who|do|does|is|are|can)/i.test(q)
  ) {
    return;
  }
  const key = q.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  out.push({ question: q, answer: a, sourceUrl });
}

function fromJsonLd(
  html: string,
  sourceUrl: string,
  out: FaqEntry[],
  seen: Set<string>
) {
  const $ = cheerio.load(html);
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html();
    if (!raw) return;
    try {
      const parsed: unknown = JSON.parse(raw);
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of nodes) {
        walkJsonLd(node, sourceUrl, out, seen);
      }
    } catch {
      /* ignore invalid JSON-LD */
    }
  });
}

function walkJsonLd(
  node: unknown,
  sourceUrl: string,
  out: FaqEntry[],
  seen: Set<string>
) {
  if (!node || typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  const type = obj["@type"];
  const types = Array.isArray(type) ? type : type ? [type] : [];
  if (types.some((t) => String(t).toLowerCase() === "faqpage")) {
    const entities = obj.mainEntity;
    const list = Array.isArray(entities) ? entities : entities ? [entities] : [];
    for (const entity of list) {
      if (!entity || typeof entity !== "object") continue;
      const e = entity as Record<string, unknown>;
      const q =
        typeof e.name === "string"
          ? e.name
          : typeof e.question === "string"
            ? e.question
            : "";
      const accepted = e.acceptedAnswer;
      let a = "";
      if (accepted && typeof accepted === "object") {
        const ans = accepted as Record<string, unknown>;
        a = typeof ans.text === "string" ? ans.text : "";
      } else if (typeof e.text === "string") {
        a = e.text;
      }
      pushUnique(out, seen, q, a, sourceUrl);
    }
  }
  if (Array.isArray(obj["@graph"])) {
    for (const child of obj["@graph"]) walkJsonLd(child, sourceUrl, out, seen);
  }
}

function fromAccordion(
  html: string,
  sourceUrl: string,
  out: FaqEntry[],
  seen: Set<string>
) {
  const $ = cheerio.load(html);
  $("details").each((_, el) => {
    const q = $(el).find("summary").first().text();
    const clone = $(el).clone();
    clone.find("summary").remove();
    const a = clone.text();
    pushUnique(out, seen, q, a, sourceUrl);
  });

  $("[itemtype*='Question'], .faq-item, .faq__item, li.faq").each((_, el) => {
    const q =
      $(el)
        .find("[itemprop='name'], .faq-question, .question, h3, h4")
        .first()
        .text() || $(el).find("summary, button").first().text();
    const a =
      $(el).find("[itemprop='text'], .faq-answer, .answer, p").first().text() ||
      $(el).text();
    if (q && a && a !== q) pushUnique(out, seen, q, a, sourceUrl);
  });
}

/** Structured FAQ extraction: JSON-LD FAQPage + accordion/details patterns. */
export function extractFaqs(corpus: CrawlCorpus): FaqEntry[] {
  const out: FaqEntry[] = [];
  const seen = new Set<string>();
  const pages = [
    ...corpus.pages.filter((p) => p.kind === "faq"),
    ...corpus.pages.filter((p) => p.kind !== "faq"),
  ];
  for (const page of pages) {
    if (out.length >= MAX_FAQS) break;
    fromJsonLd(page.html, page.url, out, seen);
    fromAccordion(page.html, page.url, out, seen);
  }
  return out.slice(0, MAX_FAQS);
}
