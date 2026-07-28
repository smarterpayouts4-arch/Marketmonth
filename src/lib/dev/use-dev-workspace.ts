"use client";

import { useEffect, useState } from "react";

import type { BrandProfile } from "@/data/mock-brand";
import {
  getDiscoveryWorkspaceHandoff,
  normalizeSuggestedPhase,
  setDiscoveryWorkspaceHandoff,
  type DashboardSuggestedPhase,
  type DiscoveryWorkspaceHandoff,
} from "@/lib/discovery-handoff";

export type DevWorkspaceContext = {
  active: boolean;
  companyName: string;
  website: string;
  userName: string;
  brandId: string;
  hasProfile: boolean;
  hasStrategy: boolean;
  suggestedPhase: DashboardSuggestedPhase;
  dashboardBrand: BrandProfile | null;
};

/**
 * Loads development workspace context: sessionStorage cache, then
 * GET /api/onboarding/workspace-context (cookie / fixture).
 */
export function useDevWorkspace(): DevWorkspaceContext | null {
  const [ctx, setCtx] = useState<DevWorkspaceContext | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const cached = getDiscoveryWorkspaceHandoff();
      if (cached && !cancelled) {
        setCtx({
          active: true,
          companyName: cached.companyName,
          website: cached.website,
          userName: cached.userName,
          brandId: cached.brandId,
          hasProfile: cached.hasProfile,
          hasStrategy: cached.hasStrategy,
          suggestedPhase: cached.suggestedPhase,
          dashboardBrand: cached.dashboardBrand,
        });
      }

      try {
        const res = await fetch("/api/onboarding/workspace-context");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          ok: boolean;
          active?: boolean;
          companyName?: string;
          website?: string;
          userName?: string;
          brandId?: string;
          hasProfile?: boolean;
          hasStrategy?: boolean;
          suggestedPhase?: string;
          dashboardBrand?: BrandProfile;
        };
        if (!data.active || cancelled) {
          if (!cached && !cancelled) {
            setCtx({
              active: false,
              companyName: "",
              website: "",
              userName: "",
              brandId: "",
              hasProfile: false,
              hasStrategy: false,
              suggestedPhase: "marketing-topic",
              dashboardBrand: null,
            });
          }
          return;
        }

        const next: DiscoveryWorkspaceHandoff = {
          brandId: data.brandId ?? cached?.brandId ?? "",
          companyName:
            data.companyName ?? cached?.companyName ?? "Zynava",
          website: data.website ?? cached?.website ?? "https://zynava.com",
          userName: data.userName ?? cached?.userName ?? "Oscar",
          hasProfile: data.hasProfile ?? cached?.hasProfile ?? false,
          hasStrategy: data.hasStrategy ?? cached?.hasStrategy ?? false,
          suggestedPhase: normalizeSuggestedPhase(
            data.suggestedPhase ?? cached?.suggestedPhase
          ),
          dashboardBrand:
            cached?.dashboardBrand ??
            data.dashboardBrand ??
            ({
              companyName: data.companyName ?? "Zynava",
              website: data.website ?? "https://zynava.com",
              description: "",
              industry: "Online business",
              products: [],
              audience: [],
              valueProposition: "",
              voiceTraits: [],
              voiceSpectra: { casualProfessional: 50, warmAuthoritative: 50 },
              faqs: [],
              colors: [],
              personality: [],
              confidence: 80,
              readiness: 100,
              checklist: [],
              reviewedAreas: 0,
              totalAreas: 8,
              status: "approved",
            } satisfies BrandProfile),
        };

        // Prefer richer session cache brand when company matches
        if (
          cached?.dashboardBrand &&
          cached.companyName === next.companyName
        ) {
          next.dashboardBrand = cached.dashboardBrand;
        }

        setDiscoveryWorkspaceHandoff(next);
        if (!cancelled) {
          setCtx({
            active: true,
            companyName: next.companyName,
            website: next.website,
            userName: next.userName,
            brandId: next.brandId,
            hasProfile: next.hasProfile,
            hasStrategy: next.hasStrategy,
            suggestedPhase: next.suggestedPhase,
            dashboardBrand: next.dashboardBrand,
          });
        }
      } catch {
        // keep cache
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return ctx;
}
