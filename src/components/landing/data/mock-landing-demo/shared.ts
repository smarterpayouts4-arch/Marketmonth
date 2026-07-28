/** Unique local assets — one photo per purpose, no logo renders. */
export const landingImagery = {
  tiktok: "/landing/tiktok.jpg",
  instagram: "/landing/instagram.jpg",
  youtube: "/landing/youtube.jpg",
  article: "/landing/article.jpg",
  month: "/landing/month.jpg",
  linkedin: "/landing/linkedin.jpg",
  facebook: "/landing/facebook.jpg",
  planning: "/landing/planning.jpg",
} as const;

export const whyDifferent = [
  {
    title: "Starts from your website",
    body: "No blank brief. Discovery learns the business before anything is planned.",
  },
  {
    title: "Ideas before assets",
    body: "You see the subjects your brand should own — then organize them into a month.",
  },
  {
    title: "Strategy you can approve",
    body: "Pillars, themes, and formats stay visible so the plan never feels like a black box.",
  },
  {
    title: "Built for a full month",
    body: "One clear path from brand understanding to a publishable marketing month.",
  },
] as const;

export const whatYouGet = [
  "Brand discovery from your site",
  "Content subjects your brand should own",
  "A monthly strategy with clear pillars",
  "One idea → many formats",
  "A reviewable plan before you publish",
] as const;

export const howItWorksSteps = [
  {
    title: "Learn the brand",
    body: "Paste a website. We discover audience, voice, and what you sell.",
  },
  {
    title: "Surface the ideas",
    body: "See the topics your business should be talking about.",
  },
  {
    title: "Shape the strategy",
    body: "Organize ideas into pillars, themes, and a monthly plan.",
  },
  {
    title: "Review & improve",
    body: "Approve what ships, then learn what worked next month.",
  },
] as const;

/** Illustrative placeholders only — never present as real customer evidence. */
export const illustrativeProof = {
  disclaimer:
    "Illustrative demo content — not real customer testimonials or ratings.",
  quotes: [
    {
      quote:
        "Placeholder: A shop owner would describe how Discovery → Content → Strategy clarified their month.",
      attribution: "Demo example · Local retailer",
    },
    {
      quote:
        "Placeholder: A founder would note that seeing subjects before assets made planning feel concrete.",
      attribution: "Demo example · Wellness brand",
    },
    {
      quote:
        "Placeholder: A marketer would say Review kept the team aligned before publishing.",
      attribution: "Demo example · Small team",
    },
  ],
  stats: [
    {
      label: "Plan a month",
      value: "One afternoon",
      note: "Illustrative pacing goal",
    },
    {
      label: "From website to ideas",
      value: "Minutes",
      note: "Illustrative demo timing",
    },
    {
      label: "Formats from one idea",
      value: "5+",
      note: "Illustrative format spread",
    },
  ],
} as const;
