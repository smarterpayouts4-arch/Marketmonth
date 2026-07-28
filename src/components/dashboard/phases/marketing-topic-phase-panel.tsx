"use client";

import { MarketingTopicWorkspace } from "@/components/dashboard/marketing-topic/marketing-topic-workspace";
import { useDevWorkspace } from "@/lib/dev/use-dev-workspace";

export function MarketingTopicPhasePanel() {
  const devWorkspace = useDevWorkspace();

  const brandName =
    devWorkspace?.companyName?.trim() ||
    devWorkspace?.dashboardBrand?.companyName?.trim() ||
    "";

  const website =
    devWorkspace?.website?.trim() ||
    devWorkspace?.dashboardBrand?.website?.trim() ||
    "";
  const domain = website ? domainFromWebsite(website) : null;
  const canGenerate = Boolean(domain);

  return (
    <MarketingTopicWorkspace
      brandName={brandName}
      domain={domain}
      canGenerate={canGenerate}
    />
  );
}

function domainFromWebsite(website: string): string | null {
  try {
    const host = new URL(
      website.startsWith("http") ? website : `https://${website}`
    ).hostname.replace(/^www\./, "");
    return host || null;
  } catch {
    return null;
  }
}
