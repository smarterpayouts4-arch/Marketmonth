"use client";

import { useState } from "react";

import { BrandConfidence } from "@/components/brand/brand-confidence";
import { BrandSummaryPanel } from "@/components/brand/brand-summary-panel";
import { PageHeader } from "@/components/shared/page-header";
import {
  AudienceSection,
  ColorsSection,
  CompanySection,
  FaqsSection,
  PersonalitySection,
  ProductsSection,
  ValuePropositionSection,
  VoiceSection,
} from "./brand-results/sections";
import { useFlashToast } from "./brand-results/toast";
import type { BrandResultsProps } from "./brand-results/types";

export function BrandResults({ brand, onApprove, onSave }: BrandResultsProps) {
  const [profile, setProfile] = useState(brand);
  const [editingCompany, setEditingCompany] = useState(false);
  const [customVoice, setCustomVoice] = useState("");
  const { toast, flash } = useFlashToast();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="STEP 1 OF 6 · LEARN"
        title="Here's what we learned."
        description="Review the profile below. You can change anything before it becomes part of your Brand Brain."
        large
      />

      <BrandConfidence score={profile.confidence} />

      {toast ? (
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-soft animate-fade-in">
          {toast}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <CompanySection
            profile={profile}
            setProfile={setProfile}
            editingCompany={editingCompany}
            setEditingCompany={setEditingCompany}
          />
          <ProductsSection
            profile={profile}
            setProfile={setProfile}
            flash={flash}
          />
          <AudienceSection profile={profile} flash={flash} />
          <ValuePropositionSection profile={profile} flash={flash} />
          <VoiceSection
            profile={profile}
            setProfile={setProfile}
            customVoice={customVoice}
            setCustomVoice={setCustomVoice}
            flash={flash}
          />
          <FaqsSection profile={profile} flash={flash} />
          <ColorsSection profile={profile} flash={flash} />
          <PersonalitySection profile={profile} />
        </div>

        <BrandSummaryPanel
          brand={profile}
          onApprove={onApprove}
          onSave={() => {
            onSave();
            flash("Draft saved (mock)");
          }}
        />
      </div>
    </div>
  );
}
