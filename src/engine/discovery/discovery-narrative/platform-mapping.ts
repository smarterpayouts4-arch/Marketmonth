import type {
  DetectedChannel,
  PlatformAdaptation,
} from "@/lib/discovery/discovery-narrative.schema";
import type { CompanyProfileProjection } from "@/lib/company-profile/projection.schema";
import { platformDisplayName } from "@/lib/discovery/platform-names";

import type { BrandSignalGraph } from "./types";

const FORMAT_MAP: Record<string, string[]> = {
  facebook: [
    "practical education",
    "community questions",
    "comparisons",
    "FAQs",
    "customer scenarios",
  ],
  linkedin: [
    "business perspective",
    "trust",
    "technology",
    "category education",
    "founder point of view",
  ],
  youtube: [
    "demonstrations",
    "explainers",
    "deeper comparisons",
    "FAQs",
    "educational series",
  ],
  instagram: [
    "carousels",
    "concise visual education",
    "short videos",
    "checklists",
  ],
  tiktok: [
    "short hooks",
    "myths",
    "common mistakes",
    "quick demonstrations",
  ],
  x: ["concise takes", "myth-busting", "thread explainers"],
};

const ALL_PLATFORMS = [
  "facebook",
  "linkedin",
  "youtube",
  "instagram",
  "tiktok",
  "x",
] as const;

const platformLabel = platformDisplayName;

export function detectChannels(
  projection: CompanyProfileProjection
): DetectedChannel[] {
  const byPlatform = new Map<string, DetectedChannel>();

  for (const p of ALL_PLATFORMS) {
    byPlatform.set(p, { platform: p, status: "link-not-detected" });
  }

  for (const raw of projection.socialProfiles) {
    if (!raw || typeof raw !== "object") continue;
    const s = raw as { platform?: string; status?: string; url?: string };
    const platform = (s.platform ?? "").toLowerCase();
    if (!platform || !byPlatform.has(platform)) continue;
    if (s.status === "present" || s.url) {
      byPlatform.set(platform, {
        platform,
        status: "link-detected",
        sourceUrl: s.url,
      });
    }
  }

  // Also honor evidence.social.* rows
  for (const ev of projection.evidence) {
    if (!ev.field.startsWith("social.")) continue;
    const platform = ev.field.slice("social.".length).toLowerCase();
    if (!byPlatform.has(platform)) continue;
    byPlatform.set(platform, {
      platform,
      status: "link-detected",
      sourceUrl: ev.value || ev.sourceUrl,
    });
  }

  return [...byPlatform.values()];
}

/**
 * Select platforms based on detected links + content depth.
 * Never claims performance; wording is link-detected / link-not-detected only.
 */
export function buildPlatformAdaptations(
  channels: DetectedChannel[],
  graph: BrandSignalGraph
): PlatformAdaptation[] {
  const hasDepth =
    graph.contentInventory.length + graph.valueMechanism.length >= 4;
  const detected = channels.filter((c) => c.status === "link-detected");
  const notDetected = channels.filter((c) => c.status === "link-not-detected");

  const selected: DetectedChannel[] = [...detected];
  // Optional expansion candidates (max 2) when content depth supports it
  if (hasDepth) {
    for (const c of notDetected) {
      if (selected.length >= 5) break;
      if (c.platform === "instagram" || c.platform === "tiktok") {
        selected.push(c);
      }
    }
  }

  if (!selected.length) {
    selected.push(
      { platform: "facebook", status: "link-not-detected" },
      { platform: "linkedin", status: "link-not-detected" }
    );
  }

  return selected.map((c) => {
    const formats = FORMAT_MAP[c.platform] ?? ["educational posts"];
    const label = platformLabel(c.platform);
    const guidance =
      c.status === "link-detected"
        ? `Your website already links to ${label}, making it a natural starting point for ${formats[0]}.`
        : `No ${label} link was detected on the website. ${formats[0].charAt(0).toUpperCase()}${formats[0].slice(1)} may be an expansion option if it matches your audience and production capacity.`;

    return {
      platform: c.platform,
      status: c.status,
      sourceUrl: c.sourceUrl,
      formats,
      guidance,
      classification:
        c.status === "link-detected" ? ("observed" as const) : ("recommended" as const),
    };
  });
}
