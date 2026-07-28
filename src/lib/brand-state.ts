import { completedBrand, type BrandProfile } from "@/data/mock-brand";

export type BrandFlowPhase =
  | "idle"
  | "scanning"
  | "reveal"
  | "results"
  | "approved"
  | "error";

export function isValidWebsiteUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const url = new URL(withProtocol);
    return Boolean(url.hostname.includes("."));
  } catch {
    return false;
  }
}

export function createResultsProfile(website: string): BrandProfile {
  return {
    ...completedBrand,
    website: website.startsWith("http") ? website : `https://${website}`,
    status: "ready",
    readiness: 92,
    confidence: 87,
    reviewedAreas: 8,
  };
}
