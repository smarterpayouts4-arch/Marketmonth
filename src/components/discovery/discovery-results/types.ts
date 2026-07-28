import type { DiscoveryActivationProfile } from "@/lib/discovery/activation-profile";

import type { DiscoveryInvestments } from "@/components/discovery/activation";
import type { BrandProfileView } from "@/components/discovery/types";

export type DiscoveryResultsProps = {
  profile: BrandProfileView;
  /** Grounded engine activation — required for personalized options. */
  activationProfile: DiscoveryActivationProfile;
  onContinue: (investments: DiscoveryInvestments) => void;
  onTryAnother: () => void;
  voice?: "you" | "they";
};
