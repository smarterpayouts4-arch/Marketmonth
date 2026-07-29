import type { BrandSignals, FaqEntry } from "../types";

const CHROME_MARKERS =
  /\b(How It Works|Contact|More|Home|Learn|Our Philosophy|Supplements|Health Tools|Retailers|Research|Privacy|Terms|Cookie)\b/i;

const GENERIC_AUDIENCE =
  /customers researching solutions in this category|decision-makers|primary audience|businesses looking|customers who want|people evaluating options in this space/i;

const GENERIC_VP =
  /help customers understand offerings and take the next step/i;

function stripChrome(text: string): string {
  let t = text.replace(/\s+/g, " ").trim();
  // Drop leading chrome runs glued without spaces
  t = t.replace(
    /^(?:How It Works|Contact|More|✕|Home|Learn|Our Philosophy|Supplements|Health Tools|Retailers|Research|About|Contact)+/i,
    ""
  );
  t = t.replace(CHROME_MARKERS, " ");
  return t.replace(/\s+/g, " ").trim();
}

function looksChromeHeavy(text: string): boolean {
  const chromeHits = (
    text.match(
      /How It Works|ContactMore|✕Home|Our Philosophy|Health Tools/gi
    ) ?? []
  ).length;
  return chromeHits >= 2 || /How It WorksContact/i.test(text);
}

function faqByTopic(faqs: FaqEntry[], topic: RegExp): FaqEntry | undefined {
  return faqs.find(
    (f) => topic.test(f.question) || topic.test(f.answer.slice(0, 80))
  );
}

export type DerivedNarrative = {
  description: string;
  audience: string;
  valueProposition: string;
  services: string[];
  brandVoice: string;
  marketingOpportunity: string;
  notes: string[];
};

/**
 * Evidence-grounded rules narrative — no hardcoded templates.
 * Empty fields when unsupported so the quality gate can reject.
 */
export function deriveNarrative(input: {
  businessName: string;
  signals: BrandSignals;
}): DerivedNarrative {
  const notes: string[] = [];
  const about = stripChrome(input.signals.aboutText || "");
  const meta = (input.signals.metaDescription || "").trim();
  const faqs = input.signals.faqs ?? [];
  const whatIs = faqByTopic(faqs, /what is|who (is|are)|about/i);
  const whoFor = faqByTopic(
    faqs,
    /who (is|are).*(for|use)|audience|customer|confused|looking for/i
  );

  let description = "";
  if (whatIs?.answer && !looksChromeHeavy(whatIs.answer)) {
    description = stripChrome(whatIs.answer).slice(0, 320);
    notes.push("description from FAQ");
  } else if (about.length >= 60 && !looksChromeHeavy(about)) {
    description = about.slice(0, 320);
    notes.push("description from about text");
  } else if (meta.length >= 40 && !looksChromeHeavy(meta)) {
    description = meta.slice(0, 320);
    notes.push("description from meta");
  } else {
    notes.push("description unsupported — left empty");
  }

  let audience = "";
  if (whoFor?.answer && !looksChromeHeavy(whoFor.answer)) {
    const a = stripChrome(whoFor.answer).slice(0, 220);
    if (!GENERIC_AUDIENCE.test(a)) {
      audience = a;
      notes.push("audience from FAQ");
    }
  }
  if (!audience && about.length >= 80) {
    const m = about.match(
      /(?:individuals|people|customers|shoppers|anyone)\s+[^.]{10,160}/i
    );
    if (m?.[0] && !GENERIC_AUDIENCE.test(m[0])) {
      audience = m[0].replace(/\s+/g, " ").trim().slice(0, 220);
      notes.push("audience from about passage");
    }
  }

  let valueProposition = "";
  if (meta && !GENERIC_VP.test(meta) && !looksChromeHeavy(meta)) {
    valueProposition = meta.slice(0, 220);
    notes.push("valueProposition from meta");
  } else if (description && !GENERIC_VP.test(description)) {
    valueProposition = description.slice(0, 220);
    notes.push("valueProposition from description");
  }

  // Services: only observed headings that look like offer names — never invented labels.
  const services: string[] = [];
  const seen = new Set<string>();
  for (const h of input.signals.headings) {
    const label = h.replace(/\s+/g, " ").trim();
    if (label.length < 4 || label.length > 60) continue;
    if (/^(home|about|contact|blog|faq|menu|login)$/i.test(label)) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    services.push(label);
    if (services.length >= 6) break;
  }
  if (services.length > 0) notes.push("services from observed headings");

  const brandVoice =
    /clear|helpful|evidence|transparent|trust/i.test(
      [
        about,
        input.signals.productText || "",
        input.signals.bodySample || "",
        ...faqs.map((f) => `${f.question} ${f.answer}`),
      ].join(" ")
    )
      ? "Clear · Evidence-minded · Helpful"
      : "";

  // No templated marketingOpportunity — empty unless a FAQ names a growth/content angle.
  let marketingOpportunity = "";
  const growthFaq = faqByTopic(
    faqs,
    /how (do|can|should)|what (should|to)|learn|educat|content|marketing/i
  );
  if (growthFaq?.question && !looksChromeHeavy(growthFaq.question)) {
    marketingOpportunity = stripChrome(growthFaq.question).slice(0, 220);
    notes.push("marketingOpportunity from FAQ question");
  } else {
    notes.push("marketingOpportunity unsupported — left empty");
  }

  return {
    description,
    audience,
    valueProposition,
    services: services.slice(0, 6),
    brandVoice,
    marketingOpportunity,
    notes,
  };
}

export function isGenericAudience(value: string): boolean {
  return GENERIC_AUDIENCE.test(value);
}

export function isGenericValueProposition(value: string): boolean {
  return GENERIC_VP.test(value);
}

export function descriptionHasChrome(value: string): boolean {
  return looksChromeHeavy(value) || /How It WorksContact/i.test(value);
}
