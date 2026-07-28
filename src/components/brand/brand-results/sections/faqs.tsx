import { BrandSectionCard } from "@/components/brand/brand-section-card";
import type { SectionBaseProps } from "./shared";

export function FaqsSection({ profile, flash }: SectionBaseProps) {
  return (
    <BrandSectionCard
      title="Frequently Asked Questions"
      actionLabel="View All FAQs"
      onAction={() => flash("Showing sample FAQs")}
    >
      <p className="mb-3 text-sm text-text-secondary">
        {profile.faqs.length} FAQs discovered
      </p>
      <ul className="space-y-3">
        {profile.faqs.map((faq) => (
          <li
            key={faq.question}
            className="rounded-xl border border-border bg-background px-3 py-3"
          >
            <p className="text-sm font-medium">{faq.question}</p>
          </li>
        ))}
      </ul>
    </BrandSectionCard>
  );
}
