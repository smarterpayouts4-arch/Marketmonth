import * as cheerio from "cheerio";

export function extractTestimonials(html: string): string[] {
  const $ = cheerio.load(html);
  const quotes: string[] = [];
  $("blockquote, [class*='testimonial'], [class*='review']").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text.length > 40 && text.length < 400) quotes.push(text);
  });
  return quotes.slice(0, 4);
}

export function extractCtas(html: string): string[] {
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
