import { BrandSectionCard } from "@/components/brand/brand-section-card";
import type { SectionBaseProps, SetProfile } from "./shared";

export function ProductsSection({
  profile,
  setProfile,
  flash,
}: SectionBaseProps & { setProfile: SetProfile }) {
  return (
    <BrandSectionCard
      title="Products & Services"
      actionLabel="Add Product"
      onAction={() => {
        setProfile((prev) => ({
          ...prev,
          products: [...prev.products, "New product"],
        }));
        flash("Product added (mock)");
      }}
    >
      <div className="flex flex-wrap gap-2">
        {profile.products.map((product) => (
          <span
            key={product}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium"
          >
            {product}
          </span>
        ))}
      </div>
    </BrandSectionCard>
  );
}
