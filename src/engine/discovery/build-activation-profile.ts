/**
 * Grounded DiscoveryActivationProfile — engine-owned strategist step.
 * Options require website evidence; otherwise honest low-evidence fallbacks.
 */
import type {
  ActivationEvidence,
  DiscoveryActivationProfile,
  DiscoveryOption,
} from "@/lib/discovery/activation-profile";

import { failsGenericInsight } from "./activation-guards";
import type { BrandProfile } from "./brand-profile";
import {
  isCompleteSentence,
  toDisplaySentence,
} from "./complete-sentence";
import { collectOfferHints, isJunkOfferFragment } from "./extract-offers";
import type { BrandSignals, FaqEntry } from "./types";

type BuildInput = {
  brandProfile: BrandProfile;
  signals?: BrandSignals | null;
  faqs?: FaqEntry[];
  offerHints?: string[];
};

function emptySignals(): BrandSignals {
  return {
    title: "",
    metaDescription: "",
    headings: [],
    colors: [],
    contactEmails: [],
    contactPhones: [],
    aboutText: "",
    productText: "",
    faqText: "",
    faqs: [],
    catalogProducts: [],
    organization: null,
    bodySample: "",
    testimonialText: "",
    blogText: "",
    ctaTexts: [],
    locationHints: [],
  };
}

function obs(
  text: string,
  confidence: ActivationEvidence["confidence"] = "high",
  sourceUrl?: string
): ActivationEvidence | null {
  const display = toDisplaySentence(text) ?? (isCompleteSentence(text) ? text.trim() : null);
  if (!display) return null;
  return {
    text: display,
    kind: "observed",
    confidence,
    sourceUrl,
  };
}

function pushObs(
  list: ActivationEvidence[],
  text: string,
  confidence: ActivationEvidence["confidence"] = "high",
  sourceUrl?: string
) {
  const item = obs(text, confidence, sourceUrl);
  if (item) list.push(item);
}

function siteTiedInterp(
  template: string,
  siteNoun: string | undefined
): ActivationEvidence | null {
  const noun = siteNoun?.replace(/\s+/g, " ").trim();
  if (!noun || noun.length < 3) return null;
  const text = template.replace("{noun}", noun);
  if (!toDisplaySentence(text) && !isCompleteSentence(text)) return null;
  return {
    text: toDisplaySentence(text) ?? text,
    kind: "interpreted",
    confidence: "medium",
  };
}

function siteTiedRec(
  template: string,
  siteNoun: string | undefined
): ActivationEvidence | null {
  const noun = siteNoun?.replace(/\s+/g, " ").trim();
  if (!noun || noun.length < 3) return null;
  const text = template.replace("{noun}", noun);
  return {
    text: toDisplaySentence(text) ?? text,
    kind: "recommended",
    confidence: "medium",
  };
}

function slug(prefix: string, label: string, index: number): string {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${prefix}-${base || index}`;
}

function siteCorpus(profile: BrandProfile, signals?: BrandSignals | null): string {
  return [
    profile.description,
    profile.valueProposition,
    profile.audience,
    profile.marketingOpportunity,
    ...profile.products,
    ...profile.services,
    signals?.faqText,
    signals?.aboutText,
    signals?.productText,
    signals?.bodySample,
    ...(signals?.headings ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

const INDUSTRY_GUARDS = [
  "supplement",
  "dietary",
  "ingredient",
  "vitamin",
  "protein powder",
  "keto",
  "vegan diet",
];

function mentionsIndustry(corpus: string): boolean {
  return INDUSTRY_GUARDS.some((w) => corpus.includes(w));
}

function stripIndustryUnlessGrounded(label: string, corpus: string): boolean {
  const lower = label.toLowerCase();
  for (const word of INDUSTRY_GUARDS) {
    if (lower.includes(word) && !corpus.includes(word)) return false;
  }
  return true;
}

function shortLabel(text: string, maxWords = 10): string {
  const display = toDisplaySentence(text, { maxWords });
  if (display) return display.replace(/[.!?]+$/, "");
  const words = text.replace(/\s+/g, " ").trim().split(/\s+/).filter(Boolean);
  return words.slice(0, maxWords).join(" ");
}

function tensionCandidates(
  profile: BrandProfile,
  faqs: FaqEntry[],
  corpus: string
): Array<{ label: string; explanation: string; evidence: ActivationEvidence[] }> {
  const out: Array<{
    label: string;
    explanation: string;
    evidence: ActivationEvidence[];
  }> = [];

  const audience =
    toDisplaySentence(profile.audience || "") ||
    (profile.audience?.trim() ? profile.audience.trim() : "");
  if (audience) {
    const evidence: ActivationEvidence[] = [];
    pushObs(evidence, audience, "high");
    out.push({
      label: shortLabel(audience, 10),
      explanation:
        toDisplaySentence(
          `Audience language on the site points to this evaluation moment around ${audience.replace(/[.!?]+$/, "").toLowerCase()}.`
        ) ||
        "Audience language on the site points to this evaluation moment.",
      evidence,
    });
  }

  for (const faq of faqs.slice(0, 4)) {
    const q = faq.question.replace(/\?+$/, "").trim();
    if (q.length < 10) continue;
    const evidence: ActivationEvidence[] = [];
    pushObs(evidence, faq.question.endsWith("?") ? faq.question : `${faq.question}?`, "high", faq.sourceUrl);
    const answerDisplay = toDisplaySentence(faq.answer);
    if (answerDisplay) pushObs(evidence, answerDisplay, "medium", faq.sourceUrl);
    out.push({
      label: shortLabel(q, 10),
      explanation:
        answerDisplay ||
        toDisplaySentence(`Shoppers ask about ${q.toLowerCase()} on the site.`) ||
        `Shoppers ask about ${q.toLowerCase()} on the site.`,
      evidence,
    });
  }

  const needBits = [
    profile.description,
    profile.valueProposition,
    profile.marketingOpportunity,
  ]
    .map((t) => toDisplaySentence(t || "") || "")
    .filter(Boolean);

  for (const bit of needBits) {
    if (
      /compar|choice|confus|decid|fit|cost|price|uncertain|overwhelm|trust|risk/i.test(
        bit
      )
    ) {
      const label = /compar|choice|option/i.test(bit)
        ? "Comparing similar options"
        : /cost|price|value|budget/i.test(bit)
          ? "Weighing cost against fit"
          : /fit|personal|prefer|goal/i.test(bit)
            ? "Finding what fits their situation"
            : shortLabel(bit, 10);
      if (!stripIndustryUnlessGrounded(label, corpus)) continue;
      const evidence: ActivationEvidence[] = [];
      pushObs(evidence, bit, "medium");
      out.push({
        label,
        explanation: bit,
        evidence,
      });
    }
  }

  const seen = new Set<string>();
  return out.filter((item) => {
    const key = item.label.toLowerCase();
    if (seen.has(key)) return false;
    if (!stripIndustryUnlessGrounded(item.label, corpus)) return false;
    seen.add(key);
    return true;
  });
}

function growthCandidates(
  profile: BrandProfile,
  corpus: string,
  businessName: string
): Array<{
  label: string;
  explanation: string;
  evidence: ActivationEvidence[];
  strategyGoal: NonNullable<DiscoveryOption["strategyGoal"]>;
}> {
  const out: Array<{
    label: string;
    explanation: string;
    evidence: ActivationEvidence[];
    strategyGoal: NonNullable<DiscoveryOption["strategyGoal"]>;
  }> = [];

  const opp = toDisplaySentence(profile.marketingOpportunity || "", {
    businessName,
  });
  if (
    opp &&
    !failsGenericInsight(opp) &&
    !/tiktok|instagram|youtube|linkedin|facebook/i.test(opp)
  ) {
    const evidence: ActivationEvidence[] = [];
    pushObs(evidence, opp, "high");
    out.push({
      label: shortLabel(opp, 8),
      explanation: opp,
      evidence,
      strategyGoal: /compar|choice|confiden/i.test(opp)
        ? "awareness"
        : /fit|personal|recommend/i.test(opp)
          ? "leads"
          : "sales",
    });
  }

  for (const theme of profile.seoSummary?.contentOpportunities ?? []) {
    const line = toDisplaySentence(theme, { businessName });
    if (!line || failsGenericInsight(line)) continue;
    if (/tiktok|instagram|expand to|post more/i.test(line)) continue;
    if (!stripIndustryUnlessGrounded(line, corpus)) continue;
    const evidence: ActivationEvidence[] = [];
    pushObs(evidence, line, "medium");
    out.push({
      label: shortLabel(line, 8),
      explanation: line,
      evidence,
      strategyGoal: "awareness",
    });
  }

  const vp = toDisplaySentence(profile.valueProposition || "", { businessName });
  if (vp && out.length < 2) {
    const evidence: ActivationEvidence[] = [];
    pushObs(evidence, vp, "medium");
    out.push({
      label: shortLabel(vp, 8),
      explanation:
        toDisplaySentence(
          `Position content around ${vp.replace(/[.!?]+$/, "").toLowerCase()}.`
        ) || vp,
      evidence,
      strategyGoal: "leads",
    });
  }

  const seen = new Set<string>();
  return out.filter((item) => {
    const key = item.label.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const NEUTRAL_TENSION_FALLBACKS: Array<{
  label: string;
  explanation: string;
}> = [
  {
    label: "Comparing similar options",
    explanation:
      "A common moment when the site lists several offerings without a clear choice path.",
  },
  {
    label: "Finding what fits their situation",
    explanation:
      "Use when buyers need help matching an offer to their constraints.",
  },
  {
    label: "Weighing cost against outcomes",
    explanation:
      "Use when price and suitability both matter, but the site does not name one dominant buyer moment.",
  },
];

const NEUTRAL_GROWTH_FALLBACKS: Array<{
  label: string;
  explanation: string;
  strategyGoal: NonNullable<DiscoveryOption["strategyGoal"]>;
}> = [
  {
    label: "Clarify the decision",
    explanation:
      "Lead with content that helps buyers choose clearly among the options you already offer.",
    strategyGoal: "awareness",
  },
  {
    label: "Show personal fit",
    explanation:
      "Lead with content that maps offers to different situations and constraints.",
    strategyGoal: "leads",
  },
  {
    label: "Explain value in context",
    explanation:
      "Lead with content that pairs suitability with cost — not price alone.",
    strategyGoal: "sales",
  },
];

function composeCustomerValueInsight(
  name: string,
  vp: string | null,
  offer: string | undefined,
  strong: boolean
): string {
  if (!strong) {
    return "Your website describes several capabilities, but one clear customer outcome is not repeated consistently.";
  }
  if (vp) {
    // Prefer the original complete sentence when it already reads clearly
    if (!new RegExp(`^${name}\\b`, "i").test(vp) && isCompleteSentence(vp)) {
      return vp;
    }
    const withoutBrand =
      toDisplaySentence(vp, { businessName: name }) || vp;
    if (
      withoutBrand &&
      !new RegExp(`^${name}\\b`, "i").test(withoutBrand) &&
      isCompleteSentence(withoutBrand)
    ) {
      return withoutBrand;
    }
  }
  if (offer && !isJunkOfferFragment(offer)) {
    return (
      toDisplaySentence(
        `${name}'s clearest customer value centers on ${offer}.`,
        { businessName: name }
      ) || `${name}'s clearest customer value centers on ${offer}.`
    );
  }
  return (
    toDisplaySentence(`${name} presents a clear offer on the website.`) ||
    `${name} presents a clear offer on the website.`
  );
}

export function buildDiscoveryActivationProfile(
  input: BuildInput
): DiscoveryActivationProfile {
  const { brandProfile: profile } = input;
  const signals = input.signals ?? null;
  const faqs = input.faqs ?? signals?.faqs ?? [];
  const corpus = siteCorpus(profile, signals);
  const name = profile.businessName || "This brand";

  const rawOffers =
    input.offerHints?.length
      ? input.offerHints
      : collectOfferHints(signals ?? emptySignals(), profile);
  const offers = rawOffers.filter((o) => !isJunkOfferFragment(o));

  // —— Customer Value (brandCore) ——
  const brandEvidence: ActivationEvidence[] = [];
  const desc = toDisplaySentence(profile.description || "", { businessName: name });
  const vp = toDisplaySentence(profile.valueProposition || "", {
    businessName: name,
  });
  if (desc) pushObs(brandEvidence, desc, "high", profile.website);
  if (vp && vp !== desc) pushObs(brandEvidence, vp, "high", profile.website);
  for (const offer of offers.slice(0, 2)) {
    if (brandEvidence.length >= 3) break;
    pushObs(
      brandEvidence,
      `The site lists ${offer} as an offer.`,
      "medium",
      profile.website
    );
  }

  const brandStrong =
    brandEvidence.length >= 1 &&
    Boolean(desc || vp) &&
    !failsGenericInsight(vp || desc || "") &&
    (offers.length >= 1 ||
      Boolean(profile.audience?.trim()) ||
      profile.products.length > 0 ||
      profile.services.length > 0);

  const brandInsight = composeCustomerValueInsight(
    name,
    vp,
    offers[0],
    brandStrong
  );

  const siteNoun =
    offers[0] ||
    profile.products[0] ||
    profile.services[0] ||
    (vp ? shortLabel(vp, 6) : undefined);

  if (brandStrong && siteNoun) {
    const i = siteTiedInterp(
      "Customers may care most about {noun} when deciding what to buy next.",
      siteNoun
    );
    const r = siteTiedRec(
      "Lead messaging with {noun} before expanding into secondary offers.",
      siteNoun
    );
    if (i) brandEvidence.push(i);
    if (r) brandEvidence.push(r);
  }

  // —— Buyer moments ——
  const tensionRaw = tensionCandidates(profile, faqs, corpus);
  let buyerTensions: DiscoveryOption[];
  if (tensionRaw.length >= 1) {
    buyerTensions = tensionRaw.slice(0, 5).map((t, i) => ({
      id: slug("tension", t.label, i),
      label: t.label,
      explanation: t.explanation,
      evidence: t.evidence,
      confidence: t.evidence.some((e) => e.confidence === "high")
        ? "high"
        : "medium",
      recommended: i === 0,
    }));
  } else {
    buyerTensions = NEUTRAL_TENSION_FALLBACKS.map((t, i) => ({
      id: slug("tension-fallback", t.label, i),
      label: t.label,
      explanation: t.explanation,
      evidence: [
        {
          text: "Your website describes services or products, but we could not confidently identify one dominant buyer moment.",
          kind: "observed" as const,
          confidence: "low" as const,
        },
      ],
      confidence: "low" as const,
      recommended: false,
    }));
  }

  // —— Lead offers ——
  const leadOffers: DiscoveryOption[] = offers.slice(0, 5).map((offer, i) => ({
    id: slug("offer", offer, i),
    label: offer,
    explanation:
      toDisplaySentence(
        `${offer} appears on the website as a product or service to lead with.`
      ) || `${offer} appears on the website as a product or service to lead with.`,
    evidence: (() => {
      const e: ActivationEvidence[] = [];
      pushObs(e, `The site lists ${offer}.`, "high", profile.website);
      return e;
    })(),
    confidence: "high" as const,
    recommended: i === 0,
  }));

  // —— Growth directions ——
  const growthRaw = growthCandidates(profile, corpus, name);
  let growthDirections: DiscoveryOption[];
  if (growthRaw.length >= 1) {
    growthDirections = growthRaw.slice(0, 4).map((g, i) => ({
      id: slug("growth", g.label, i),
      label: g.label,
      explanation: g.explanation,
      evidence: g.evidence,
      confidence: g.evidence.some((e) => e.confidence === "high")
        ? ("high" as const)
        : ("medium" as const),
      recommended: i === 0,
      strategyGoal: g.strategyGoal,
    }));
  } else {
    growthDirections = NEUTRAL_GROWTH_FALLBACKS.map((g, i) => ({
      id: slug("growth-fallback", g.label, i),
      label: g.label,
      explanation: g.explanation,
      evidence: [
        {
          text: "We could not derive a site-specific growth direction with confidence, so these are neutral starting points.",
          kind: "observed" as const,
          confidence: "low" as const,
        },
      ],
      confidence: "low" as const,
      recommended: false,
      strategyGoal: g.strategyGoal,
    }));
  }

  const highEvidenceCount = [
    ...buyerTensions,
    ...leadOffers,
    ...growthDirections,
  ].filter((o) => o.confidence === "high").length;

  const evidenceQuality: DiscoveryActivationProfile["evidenceQuality"] =
    !brandStrong || leadOffers.length === 0 || highEvidenceCount < 2
      ? "low"
      : highEvidenceCount >= 5
        ? "strong"
        : "moderate";

  if (!mentionsIndustry(corpus)) {
    for (const list of [buyerTensions, growthDirections]) {
      for (const opt of list) {
        if (!stripIndustryUnlessGrounded(opt.label, corpus)) {
          opt.label = "Clarify the customer decision";
          opt.explanation =
            "Neutral starting point — industry-specific wording was not found on the site.";
          opt.confidence = "low";
        }
      }
    }
  }

  return {
    brandCore: {
      insight: brandInsight,
      evidence: brandEvidence.slice(0, 5),
      confidence: brandStrong ? "high" : "low",
      clarification: brandStrong
        ? undefined
        : "Your website describes several services, but we could not confidently identify one dominant customer outcome.",
    },
    buyerTensions,
    leadOffers,
    growthDirections,
    evidenceQuality,
  };
}
