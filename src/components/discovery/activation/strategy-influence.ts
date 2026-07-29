import type { StrategyPreviewView } from "@/components/discovery/types";

import type { DiscoveryInvestments } from "./types";

/**
 * Apply stored investments onto a strategy preview so user choices have
 * visible, testable consequences. Pure — no network.
 */
export function applyInvestmentsToStrategy(
  strategy: StrategyPreviewView,
  investments: DiscoveryInvestments
): StrategyPreviewView {
  const pillarLabel = investments.pillarId?.replace(/-/g, " ") ?? "core topic";
  const thesisLine =
    investments.contentDirectionEdit?.trim() ||
    `Lead with ${pillarLabel} across a connected monthly content series.`;
  const lead = pillarLabel.slice(0, 80) || strategy.leadOffer.name;

  const postingRhythm =
    investments.cadenceLevel === "light"
      ? "2 organic posts per week across selected channels"
      : investments.cadenceLevel === "active"
        ? "4–5 organic posts per week across selected channels"
        : investments.cadenceLevel === "daily"
          ? "5–7 organic posts per week across selected channels"
          : "3 organic posts per week (one every two to three days)";

  const channelRoles =
    investments.channels.length > 0
      ? investments.channels.slice(0, 3).map((channel, i) => {
          const prior = strategy.channelRoles[i]?.evidenceIds ?? [];
          return {
            channel,
            role:
              strategy.channelRoles[i]?.role ??
              "Organic storytelling and offer awareness",
            status: "detected" as const,
            rationale: `Selected during discovery investment for ${channel}.`,
            evidenceIds: prior.length > 0 ? prior : ["discovery-investment"],
          };
        })
      : strategy.channelRoles;

  const pillars = strategy.contentPillars.map((pillar, index) => {
    if (index === 0 && investments.pillarId) {
      return {
        ...pillar,
        name: pillarLabel
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ")
          .slice(0, 40),
        purpose: `Anchor the month on ${pillarLabel}.`,
      };
    }
    return pillar;
  });

  return {
    ...strategy,
    strategyThesis: {
      ...strategy.strategyThesis,
      headline: thesisLine.slice(0, 160),
      explanation: [
        thesisLine,
        `Cadence: ${investments.cadenceLevel}.`,
        investments.channels.length
          ? `Channels: ${investments.channels.join(", ")}.`
          : null,
      ]
        .filter(Boolean)
        .join(" ")
        .slice(0, 400),
      rationale:
        "Shaped by your discovery investments (cadence, channels, and content direction).",
    },
    leadOffer: {
      ...strategy.leadOffer,
      name: lead.slice(0, 80),
      reason: "Selected as the first theme to promote from discovery investments.",
    },
    contentPillars: pillars,
    channelRoles,
    postingRhythm,
    firstCampaign: {
      ...strategy.firstCampaign,
      premise: `${thesisLine} Series follows a ${investments.cadenceLevel} rhythm.`.slice(
        0,
        280
      ),
    },
    keyOpportunity: thesisLine.slice(0, 220),
  };
}
