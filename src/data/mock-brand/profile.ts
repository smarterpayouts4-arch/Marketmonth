import type { BrandProfile } from "./types";

export const completedBrand: BrandProfile = {
  companyName: "Acme Wellness",
  website: "https://acmewellness.example",
  description:
    "Acme Wellness helps busy adults make more informed decisions about everyday health and wellness products.",
  industry: "Health & Wellness",
  products: [
    "Supplements",
    "Wellness Guides",
    "Product Comparisons",
    "Educational Content",
  ],
  audience: [
    "Health-conscious adults",
    "Age 25–55",
    "Value-conscious shoppers",
    "People researching supplements",
  ],
  valueProposition:
    "Helping consumers understand wellness products and compare choices without spending hours researching.",
  voiceTraits: [
    "Helpful",
    "Trustworthy",
    "Educational",
    "Conversational",
    "Clear",
  ],
  voiceSpectra: {
    casualProfessional: 62,
    warmAuthoritative: 48,
  },
  faqs: [
    {
      question: "How do your recommendations work?",
      answer:
        "We organize product information and comparisons so shoppers can evaluate options faster.",
    },
    {
      question: "Do you sell supplements directly?",
      answer:
        "No. We help people research and compare products across retailers.",
    },
    {
      question: "How are products compared?",
      answer:
        "We look at ingredients, value signals, and publicly available product details.",
    },
    {
      question: "How often is pricing updated?",
      answer: "Pricing context is refreshed regularly from available sources.",
    },
  ],
  colors: [
    { hex: "#31695A", name: "Primary" },
    { hex: "#202522", name: "Ink" },
    { hex: "#F8F7F3", name: "Canvas" },
    { hex: "#D97757", name: "Warm" },
  ],
  personality: ["Smart", "Approachable", "Useful"],
  confidence: 87,
  readiness: 100,
  checklist: [
    { id: "website", label: "Website", ready: true },
    { id: "audience", label: "Audience", ready: true },
    { id: "voice", label: "Voice", ready: true },
    { id: "products", label: "Products", ready: true },
    { id: "colors", label: "Colors", ready: true },
  ],
  reviewedAreas: 8,
  totalAreas: 8,
  status: "approved",
};
