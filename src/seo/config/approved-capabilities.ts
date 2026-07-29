/**
 * Honest public capabilities for llms.txt / structured data.
 * Align with project-knowledge/CURRENT_STATE.md - do not invent live features.
 *
 * `live` feeds SoftwareApplication.featureList - keep only visitor-demonstrable
 * Partial/Live capabilities. Prototype and explicit non-claims feed llms.txt.
 */
export const APPROVED_CAPABILITIES = {
  live: [
    "Website discovery crawl (brand, SEO signals, social, competitor hints)",
    "Evidence-grounded topic and content-direction candidates for human selection",
    "Strategy-linked YouTube Short build path after one direction is chosen",
    "Human review before anything publishes",
  ],
  prototype: [
    "Full multi-channel month calendar and review shells",
    "Analytics and publish backends",
    "Channels other than YouTube Short (scaffolds only)",
  ],
  doesNotClaim: [
    "Guaranteed search rankings or AI citations",
    "Medical or legal advice",
    "AI-approved or AI-certified endorsement",
    "Fully automated publishing without human review",
    "A complete ready-to-publish month from one click",
    "Measured full-loop timing (for example under 30 minutes)",
    "Free trial of a paid plan (current access is free analysis with no payment wall)",
  ],
} as const;
