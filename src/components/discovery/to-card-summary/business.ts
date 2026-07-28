import type { BrandProfileView } from "@/components/discovery/types";

import { LIMITS } from "./limits";
import { hostLabel, previewField } from "./text";

export type BusinessMapped = {
  businessName: string;
  website: string;
  business: string;
  businessFull: string;
  businessOverflow: boolean;
};

export function mapBusiness(profile: BrandProfileView): BusinessMapped {
  const name = previewField(
    profile.businessName || "this business",
    LIMITS.businessName
  );
  const business = previewField(
    profile.description || profile.valueProposition,
    LIMITS.business
  );

  return {
    businessName: name.preview,
    website: hostLabel(profile.website || ""),
    business: business.preview,
    businessFull: business.full,
    businessOverflow: business.overflow,
  };
}
