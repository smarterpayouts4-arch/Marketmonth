import type { Dispatch, SetStateAction } from "react";

import { BrandSectionCard } from "@/components/brand/brand-section-card";
import { VoiceSpectrum } from "@/components/brand/voice-spectrum";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addVoiceTrait, toggleVoiceTrait } from "../voice";
import type { SectionBaseProps, SetProfile } from "./shared";

export function VoiceSection({
  profile,
  setProfile,
  customVoice,
  setCustomVoice,
  flash,
}: SectionBaseProps & {
  setProfile: SetProfile;
  customVoice: string;
  setCustomVoice: Dispatch<SetStateAction<string>>;
}) {
  return (
    <BrandSectionCard
      title="Brand Voice"
      actionLabel="Adjust Voice"
      onAction={() => flash("Voice spectrum adjusted (mock)")}
    >
      <div className="flex flex-wrap gap-2">
        {profile.voiceTraits.map((trait) => (
          <button
            key={trait}
            type="button"
            onClick={() => toggleVoiceTrait(setProfile, trait)}
            className="rounded-full bg-subtle px-3 py-1.5 text-sm font-medium text-primary-dark transition-opacity hover:opacity-80"
          >
            {trait}
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Input
          value={customVoice}
          onChange={(event) => setCustomVoice(event.target.value)}
          placeholder="Add custom voice trait"
          className="h-9 rounded-xl"
          aria-label="Custom voice trait"
        />
        <Button
          type="button"
          variant="outline"
          className="h-9 rounded-xl"
          onClick={() =>
            addVoiceTrait(setProfile, customVoice, () => setCustomVoice(""))
          }
        >
          Add
        </Button>
      </div>
      <div className="mt-5 space-y-4">
        <VoiceSpectrum
          labelLeft="Casual"
          labelRight="Professional"
          value={profile.voiceSpectra.casualProfessional}
        />
        <VoiceSpectrum
          labelLeft="Warm"
          labelRight="Authoritative"
          value={profile.voiceSpectra.warmAuthoritative}
        />
      </div>
    </BrandSectionCard>
  );
}
