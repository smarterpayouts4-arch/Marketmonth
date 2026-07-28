/**
 * Honest public capabilities for llms.txt / structured data.
 * Align with project-knowledge/CURRENT_STATE.md — do not invent live features.
 */
export const APPROVED_CAPABILITIES = {
  live: [
    "Website discovery crawl (brand, SEO signals, social, competitor hints)",
    "Strategy draft preview for human review",
    "Public marketing landing with product loop overview",
  ],
  prototype: [
    "Brand / strategy / content / review / calendar app shells",
    "Analytics and publish backends",
  ],
  doesNotClaim: [
    "Guaranteed search rankings or AI citations",
    "Medical or legal advice",
    "AI-approved or AI-certified endorsement",
    "Fully automated publishing without human review",
  ],
} as const;
