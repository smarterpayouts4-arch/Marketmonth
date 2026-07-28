import { BrandSectionCard } from "@/components/brand/brand-section-card";
import type { SectionBaseProps } from "./shared";

export function AudienceSection({ profile, flash }: SectionBaseProps) {
  return (
    <BrandSectionCard
      title="Target Audience"
      actionLabel="Edit Audience"
      onAction={() => flash("Audience editor is mocked in this prototype")}
    >
      <ul className="space-y-2">
        {profile.audience.map((item) => (
          <li key={item} className="text-sm text-text-secondary">
            • {item}
          </li>
        ))}
      </ul>
    </BrandSectionCard>
  );
}

export function ValuePropositionSection({ profile, flash }: SectionBaseProps) {
  return (
    <BrandSectionCard
      title="Value Proposition"
      prominent
      onAction={() => flash("Value proposition editor is mocked")}
    >
      <p className="text-base font-medium leading-relaxed text-foreground">
        {profile.valueProposition}
      </p>
    </BrandSectionCard>
  );
}
