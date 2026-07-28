import type { Dispatch, SetStateAction } from "react";

import type { BrandProfile } from "@/data/mock-brand";

export type SetProfile = Dispatch<SetStateAction<BrandProfile>>;

export type SectionBaseProps = {
  profile: BrandProfile;
  flash: (message: string) => void;
};
