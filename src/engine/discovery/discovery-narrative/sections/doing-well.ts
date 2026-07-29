import type { DiscoverySection } from "@/lib/discovery/discovery-narrative.schema";

import type { BrandSignalGraph, EvidenceItem } from "../types";
import { truncateForEmbed } from "../../complete-sentence";
import { isHeadlineEligible } from "../normalize/score-evidence";
import type { DetectedChannel } from "@/lib/discovery/discovery-narrative.schema";
import { platformDisplayName } from "@/lib/discovery/platform-names";
import {
  bulletFrom,
  businessNoun,
  createEvidenceLedger,
  firstText,
  pickText,
} from "./helpers";

/**
 * Fits a catalog name into mid-sentence prose without destroying product codes.
 * Lowercasing the whole string turned "Vitamin B12" into "vitamin b12".
 */
function lowercaseLeadingChar(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function detectedPlatformNames(channels: DetectedChannel[]): string[] {
  return channels
    .filter((c) => c.status === "link-detected")
    .map((c) => platformDisplayName(c.platform));
}

export function buildDoingWellSection(input: {
  businessName: string;
  graph: BrandSignalGraph;
  channels: DetectedChannel[];
}): DiscoverySection {
  const name = businessNoun(input.businessName);
  const identity = pickText(input.graph.businessIdentity, 3);
  const value = pickText(input.graph.valueMechanism, 5);
  const trust = pickText(input.graph.trustSignals, 4);
  const offers = pickText(input.graph.offerInventory, 4);
  const support: EvidenceItem[] = [...value, ...trust, ...identity, ...offers];

  const eligible = isHeadlineEligible(support);
  const headline = eligible
    ? "You already have a repeatable story worth sharing."
    : "Your website gives us a useful starting foundation.";

  const vp =
    firstText(
      input.graph.valueMechanism.filter((i) => i.field === "valueProposition")
    ) || firstText(input.graph.businessIdentity.filter((i) => i.field === "organizationDescription" || i.field === "description"));

  // Boundary-safe: omit the quote entirely rather than embed a clipped fragment.
  const vpEmbed = vp ? truncateForEmbed(vp, 140) : null;

  const ledger = createEvidenceLedger();
  const bullets = [
    bulletFrom(
      vpEmbed
        ? `${name} helps customers with a clear offer: ${vpEmbed}`
        : `${name} presents a clear business offer on its website.`,
      vp
        ? input.graph.valueMechanism.filter((i) => i.field === "valueProposition").concat(identity)
        : identity,
      "observed",
      ledger
    ),
    bulletFrom(
      offers.length || value.length
        ? `Its tools and offerings support ${[
            ...offers.map((o) => o.normalizedText!),
            ...value
              .filter((v) => v.field === "products" || v.field === "services")
              .map((v) => v.normalizedText!),
          ]
            .filter(Boolean)
            .slice(0, 3)
            .map(lowercaseLeadingChar)
            .join(", ")}.`
        : `${name} lists concrete products or services worth turning into content.`,
      [...offers, ...value],
      "observed",
      ledger
    ),
    bulletFrom(
      trust.length
        ? "Trust signals on the site — independence, transparency, or evidence-minded guidance — give social content a credible base."
        : "Clear website language gives social content a credible place to start.",
      trust.length ? trust : identity,
      trust.length ? "observed" : "inferred",
      ledger
    ),
  ].filter(Boolean);

  const detected = detectedPlatformNames(input.channels);
  if (detected.length) {
    const socialBullet = bulletFrom(
      `${detected.join(", ")} ${detected.length === 1 ? "link was" : "links were"} detected on the website.`,
      input.graph.socialFootprint.length
        ? input.graph.socialFootprint
        : identity,
      "observed",
      ledger
    );
    if (socialBullet) bullets.push(socialBullet);
  }

  while (bullets.length < 3 && identity[0]) {
    const extra = bulletFrom(
      `${name} already communicates a distinct point of view customers can recognize.`,
      identity,
      "inferred",
      ledger
    );
    if (extra) bullets.push(extra);
    else break;
  }

  return {
    id: "doing-well",
    label: "What You’re Doing Well",
    subheading: "Business strength already on your site",
    headline,
    bullets: bullets.slice(0, 5) as DiscoverySection["bullets"],
    socialMeaning:
      "This is not a website score. It is the foundation that makes consistent social media feel natural instead of forced.",
    reveal: eligible
      ? "Your strongest social-media foundation is clarity: helping people understand a confusing choice without adding more noise."
      : "Even a partial foundation is enough to start a focused social-media story.",
    transition: "Next, where consistent publishing can help you win.",
  };
}
