import type { BrandProfile } from "@/data/mock-brand";
import { BrandSectionCard } from "@/components/brand/brand-section-card";
import { ColorSwatch } from "@/components/shared/color-swatch";
import type { SectionBaseProps } from "./shared";

export function ColorsSection({ profile, flash }: SectionBaseProps) {
  return (
    <BrandSectionCard
      title="Brand Colors"
      actionLabel="Edit Colors"
      onAction={() => flash("Color editor is mocked")}
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {profile.colors.map((color) => (
          <ColorSwatch
            key={color.hex}
            hex={color.hex}
            name={color.name}
            large
          />
        ))}
      </div>
    </BrandSectionCard>
  );
}

export function PersonalitySection({ profile }: { profile: BrandProfile }) {
  return (
    <BrandSectionCard title="Brand Personality">
      <div className="flex flex-wrap gap-2">
        {profile.personality.map((item) => (
          <span
            key={item}
            className="rounded-full border border-border px-3 py-1.5 text-sm font-medium"
          >
            {item}
          </span>
        ))}
      </div>
    </BrandSectionCard>
  );
}
