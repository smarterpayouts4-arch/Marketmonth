import type { BrandProfile as MockBrandProfile } from "@/data/mock-brand";
import type { BrandProfile as DiscoveryBrandProfile } from "@/engine/discovery";

import { ZYNAVA_NAME, ZYNAVA_WEBSITE } from "@/lib/dev/zynava-constants";

/** Map discovery engine profile → dashboard prototype BrandProfile. */
export function toDashboardBrand(
  profile: DiscoveryBrandProfile | null | undefined
): MockBrandProfile {
  const companyName = profile?.businessName?.trim() || ZYNAVA_NAME;
  const website = profile?.website?.trim() || ZYNAVA_WEBSITE;
  const description =
    profile?.description?.trim() ||
    `${companyName} marketing workspace (development).`;
  const products = profile?.products?.length
    ? profile.products
    : profile?.services?.length
      ? profile.services
      : ["Core offer"];
  const audience = profile?.audience
    ? [profile.audience]
    : ["Primary audience"];
  const colors = (profile?.colors ?? []).slice(0, 4).map((hex, i) => ({
    hex,
    name: i === 0 ? "Primary" : `Color ${i + 1}`,
  }));
  if (colors.length === 0) {
    colors.push(
      { hex: "#31695A", name: "Primary" },
      { hex: "#202522", name: "Ink" }
    );
  }

  return {
    companyName,
    website,
    description,
    industry: "Online business",
    products,
    audience,
    valueProposition:
      profile?.valueProposition?.trim() ||
      profile?.marketingOpportunity?.trim() ||
      description,
    voiceTraits: profile?.brandVoice
      ? profile.brandVoice.split(/[,;]/).map((s) => s.trim()).filter(Boolean).slice(0, 5)
      : ["Clear", "Helpful"],
    voiceSpectra: {
      casualProfessional: 55,
      warmAuthoritative: 50,
    },
    faqs: [],
    colors,
    personality: ["Focused", "Practical"],
    confidence: 80,
    readiness: 100,
    checklist: [
      { id: "website", label: "Website", ready: true },
      { id: "audience", label: "Audience", ready: Boolean(profile?.audience) },
      { id: "voice", label: "Voice", ready: Boolean(profile?.brandVoice) },
      { id: "products", label: "Products", ready: products.length > 0 },
      { id: "colors", label: "Colors", ready: true },
    ],
    reviewedAreas: 8,
    totalAreas: 8,
    status: "approved",
  };
}
