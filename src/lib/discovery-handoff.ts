/** Client cache for Discovery → dashboard handoff (cookie/Neon are canonical). */

import type { BrandProfile } from "@/data/mock-brand";

const HANDOFF_KEY = "mm-discovery-workspace-handoff";
/** @deprecated legacy key — still read for one release */
const COMPANY_KEY = "mm-discovery-company-name";

/** Dashboard entry after Discovery — Learn is not a dashboard phase. */
export type DashboardSuggestedPhase = "marketing-topic";

export type DiscoveryWorkspaceHandoff = {
  brandId: string;
  companyName: string;
  website: string;
  userName: string;
  hasProfile: boolean;
  hasStrategy: boolean;
  suggestedPhase: DashboardSuggestedPhase;
  dashboardBrand: BrandProfile;
};

/** Normalize legacy handoff values (`learn` / `strategy`) → marketing-topic. */
export function normalizeSuggestedPhase(
  raw: unknown
): DashboardSuggestedPhase {
  void raw;
  return "marketing-topic";
}

export function setDiscoveryWorkspaceHandoff(
  handoff: DiscoveryWorkspaceHandoff
): void {
  try {
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(handoff));
    sessionStorage.setItem(COMPANY_KEY, handoff.companyName);
  } catch {
    // ignore private-mode / quota
  }
}

export function getDiscoveryWorkspaceHandoff(): DiscoveryWorkspaceHandoff | null {
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DiscoveryWorkspaceHandoff;
    if (
      typeof parsed?.companyName !== "string" ||
      typeof parsed?.brandId !== "string" ||
      !parsed.dashboardBrand
    ) {
      return null;
    }
    return {
      ...parsed,
      suggestedPhase: normalizeSuggestedPhase(parsed.suggestedPhase),
    };
  } catch {
    return null;
  }
}
