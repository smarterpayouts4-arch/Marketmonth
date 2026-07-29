import { APPROVED_CAPABILITIES } from "../config/approved-capabilities";
import {
  absoluteUrl,
  getProductIdentity,
  namedShortDescription,
} from "../config/product-identity";
import {
  PUBLIC_POSITIONING,
  PUBLIC_PROCESS,
} from "../config/public-positioning";
import { PUBLIC_ROUTES } from "../config/public-routes";

/**
 * Experimental interoperability document for systems that choose to consume llms.txt.
 * Not a proven Google ranking mechanism - Google Search does not treat llms.txt as
 * special markup for generative search features.
 */
export function buildLlmsTxt(): string {
  const identity = getProductIdentity();
  const lines: string[] = [
    `# ${identity.displayName}`,
    "",
    `> ${namedShortDescription(identity)}`,
    "",
    "Status: working product name (see namingStatus in site SEO config).",
    "Document type: experimental interoperability summary - not a ranking certification.",
    "",
    "## Identity",
    "",
    `- Display name: ${identity.displayName}`,
    `- Compact name: ${identity.compactName}`,
    `- Tagline: ${identity.tagline}`,
    `- Short description: ${identity.shortDescription}`,
    `- Positioning: ${PUBLIC_POSITIONING.positioningStatement}`,
    `- Differentiator: ${PUBLIC_POSITIONING.differentiator}`,
    `- Canonical origin: ${identity.canonicalOrigin}`,
    "",
    "## Public pages",
    "",
  ];

  for (const route of PUBLIC_ROUTES) {
    lines.push(`- ${absoluteUrl(route.path)}`);
  }

  lines.push(
    "",
    "## Live capabilities (honest)",
    "",
    ...APPROVED_CAPABILITIES.live.map((c) => `- ${c}`),
    "",
    "## Prototype / not fully live",
    "",
    ...APPROVED_CAPABILITIES.prototype.map((c) => `- ${c}`),
    "",
    "## Explicit non-claims",
    "",
    ...APPROVED_CAPABILITIES.doesNotClaim.map((c) => `- ${c}`),
    "",
    "## Product process (customer-facing)",
    "",
    PUBLIC_PROCESS.label,
    "",
    "## Free analysis terms (current)",
    "",
    `- ${PUBLIC_POSITIONING.freeAnalysisLine}`,
    `- ${PUBLIC_POSITIONING.freeAnalysisNote}`,
    "",
    "## Contact / further reading",
    "",
    `- Landing: ${absoluteUrl("/")}`,
    ""
  );

  return lines.join("\n");
}
