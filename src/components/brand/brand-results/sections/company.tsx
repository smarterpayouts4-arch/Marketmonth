import type { Dispatch, SetStateAction } from "react";

import type { BrandProfile } from "@/data/mock-brand";
import { BrandSectionCard } from "@/components/brand/brand-section-card";
import { Input } from "@/components/ui/input";
import type { SetProfile } from "./shared";

export function CompanySection({
  profile,
  setProfile,
  editingCompany,
  setEditingCompany,
}: {
  profile: BrandProfile;
  setProfile: SetProfile;
  editingCompany: boolean;
  setEditingCompany: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <BrandSectionCard
      title="Company"
      actionLabel={editingCompany ? "Done" : "Edit"}
      onAction={() => setEditingCompany((value) => !value)}
    >
      {editingCompany ? (
        <div className="space-y-3">
          <Input
            value={profile.companyName}
            onChange={(event) =>
              setProfile((prev) => ({
                ...prev,
                companyName: event.target.value,
              }))
            }
            className="h-10 rounded-xl"
            aria-label="Company name"
          />
          <textarea
            value={profile.description}
            onChange={(event) =>
              setProfile((prev) => ({
                ...prev,
                description: event.target.value,
              }))
            }
            className="min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            aria-label="Company description"
          />
        </div>
      ) : (
        <>
          <p className="text-lg font-semibold">{profile.companyName}</p>
          <p className="mt-2 text-sm text-text-secondary">
            {profile.description}
          </p>
          <p className="mt-3 text-xs text-text-muted">{profile.website}</p>
        </>
      )}
    </BrandSectionCard>
  );
}
