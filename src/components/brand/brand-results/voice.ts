import type { Dispatch, SetStateAction } from "react";

import type { BrandProfile } from "@/data/mock-brand";

type SetProfile = Dispatch<SetStateAction<BrandProfile>>;

export function toggleVoiceTrait(setProfile: SetProfile, trait: string) {
  setProfile((prev) => {
    const exists = prev.voiceTraits.includes(trait);
    return {
      ...prev,
      voiceTraits: exists
        ? prev.voiceTraits.filter((item) => item !== trait)
        : [...prev.voiceTraits, trait],
    };
  });
}

export function addVoiceTrait(
  setProfile: SetProfile,
  trait: string,
  onAdded?: () => void
) {
  const trimmed = trait.trim();
  if (!trimmed) return;
  setProfile((prev) => ({
    ...prev,
    voiceTraits: [...prev.voiceTraits, trimmed],
  }));
  onAdded?.();
}
