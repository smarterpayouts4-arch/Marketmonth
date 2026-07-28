import type { BrandProfile } from "@/data/mock-brand";

export type BrandResultsProps = {
  brand: BrandProfile;
  onApprove: () => void;
  onSave: () => void;
};
