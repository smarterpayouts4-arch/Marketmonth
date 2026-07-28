"use client";

import { useCallback, useEffect, useState } from "react";

import { completedBrand } from "@/data/mock-brand";
import { BrandApproved } from "@/components/brand/brand-approved";
import { BrandBrainReveal } from "@/components/brand/brand-brain-reveal";
import { BrandError } from "@/components/brand/brand-error";
import { BrandResults } from "@/components/brand/brand-results";
import { BrandScanProgress } from "@/components/brand/brand-scan-progress";
import { WebsiteAnalyzeCard } from "@/components/brand/website-analyze-card";
import { PageHeader } from "@/components/shared/page-header";
import {
  createResultsProfile,
  isValidWebsiteUrl,
  type BrandFlowPhase,
} from "@/lib/brand-state";
import { usePrototypeMode } from "@/lib/prototype-mode";

export function BrandExperience() {
  const { isCompleted } = usePrototypeMode();
  const [phase, setPhase] = useState<BrandFlowPhase>("idle");
  const [website, setWebsite] = useState("https://example.com");
  const [profile, setProfile] = useState(() =>
    createResultsProfile("https://example.com")
  );
  const [scanKey, setScanKey] = useState(0);

  useEffect(() => {
    if (phase !== "results" && phase !== "approved") return;
    try {
      sessionStorage.setItem(
        "marketing-ai-brand-flow",
        JSON.stringify({ phase, website })
      );
    } catch {
      // ignore
    }
  }, [phase, website]);

  const handleScanComplete = useCallback(() => {
    const nextProfile = createResultsProfile(website);
    setProfile(nextProfile);
    setPhase("reveal");
  }, [website]);

  if (isCompleted && phase !== "approved" && phase !== "reveal") {
    return (
      <BrandResults
        brand={completedBrand}
        onApprove={() => setPhase("approved")}
        onSave={() => undefined}
      />
    );
  }

  if (phase === "approved") {
    return <BrandApproved />;
  }

  if (phase === "reveal") {
    return (
      <BrandBrainReveal
        key={website}
        brand={profile}
        onContinue={() => setPhase("results")}
      />
    );
  }

  if (phase === "results") {
    return (
      <BrandResults
        brand={profile}
        onApprove={() => setPhase("approved")}
        onSave={() => undefined}
      />
    );
  }

  function startAnalyze() {
    if (!isValidWebsiteUrl(website)) {
      setPhase("error");
      return;
    }
    setScanKey((value) => value + 1);
    setPhase("scanning");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="STEP 1 OF 6 · LEARN"
        title="Teach us about your brand."
        description="Start with your website. We'll organize what we find into a reusable Brand Profile that powers your future strategy and content."
        large
      />

      {phase === "error" ? (
        <BrandError
          onTryAgain={() => setPhase("idle")}
          onManual={() => {
            setProfile(createResultsProfile(website || "https://example.com"));
            setPhase("results");
          }}
        />
      ) : null}

      {phase === "idle" ? (
        <WebsiteAnalyzeCard
          value={website}
          onChange={setWebsite}
          onAnalyze={startAnalyze}
        />
      ) : null}

      {phase === "scanning" ? (
        <BrandScanProgress
          key={scanKey}
          website={website}
          onComplete={handleScanComplete}
        />
      ) : null}
    </div>
  );
}
