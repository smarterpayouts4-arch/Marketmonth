import type { SocialDiscoveryProfile } from "@/lib/discovery/discovery-narrative.schema";
import type { DiscoveryInvestments } from "@/components/discovery/activation";
import type { BrandProfileView } from "@/components/discovery/types";

export type DiscoveryResultsProps = {
  profile: BrandProfileView;
  discoveryNarrative: SocialDiscoveryProfile;
  onContinue: (investments: DiscoveryInvestments) => void;
  onTryAnother: () => void;
  voice?: "you" | "they";
};
