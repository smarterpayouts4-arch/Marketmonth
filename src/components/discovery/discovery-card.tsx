"use client";

import {
  toStrategyIntentAnswers,
  type DiscoveryInvestments,
} from "@/components/discovery/activation";
import { DiscoveryForm } from "@/components/discovery/discovery-form";
import { DiscoveryGeneratingStrategy } from "@/components/discovery/discovery-generating-strategy";
import { DiscoveryIntent } from "@/components/discovery/discovery-intent";
import { DiscoveryLoading } from "@/components/discovery/discovery-loading";
import { DiscoveryProgress } from "@/components/discovery/discovery-progress";
import { DiscoveryResults } from "@/components/discovery/discovery-results";
import { DiscoveryStrategyPreview } from "@/components/discovery/discovery-strategy-preview";
import { useDiscovery } from "@/components/discovery/hooks/use-discovery";
import { cn } from "@/lib/utils";

type DiscoveryCardProps = {
  onPreviewBrandChange?: (preview: {
    brandName: string;
    coreIdeaHint?: string;
  }) => void;
};

export function DiscoveryCard({ onPreviewBrandChange }: DiscoveryCardProps) {
  const {
    status,
    url,
    setUrl,
    error,
    stages,
    brandProfile,
    activationProfile,
    strategyPreview,
    pageCount,
    detectedLocations,
    intentAnswers,
    ids,
    defaultPromoteFirst,
    foundAudience,
    foundOffer,
    foundPresence,
    analyze,
    goToResult,
    submitIntent,
    reset,
  } = useDiscovery({ onPreviewBrandChange });

  function handleActivationContinue(investments: DiscoveryInvestments) {
    const answers = toStrategyIntentAnswers(investments, {
      reach: "online_broad",
      fallbackPromoteFirst: defaultPromoteFirst,
    });
    void submitIntent(answers, investments);
  }

  return (
    <article
      className={cn(
        "discovery-card-shell w-full rounded-[1.35rem] border border-border/90 bg-card shadow-lift ring-1 ring-foreground/5"
      )}
    >
      {status !== "result" ? (
        <header className="shrink-0">
          <DiscoveryProgress status={status} />
        </header>
      ) : null}

      <div className="discovery-card-body flex min-h-0 flex-1 flex-col px-4 py-4 sm:px-5 sm:pb-5">
        {(status === "empty" || status === "error") && (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <DiscoveryForm
              url={url}
              onUrlChange={setUrl}
              onAnalyze={() => analyze(url)}
            />
            {error ? (
              <p className="mt-3 text-sm text-danger" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        )}

        {status === "loading" && (
          <div className="flex min-h-0 flex-1 flex-col">
            <DiscoveryLoading stages={stages} />
          </div>
        )}

        {status === "result" && brandProfile && activationProfile && (
          <div className="flex min-h-0 flex-1 flex-col">
            <DiscoveryResults
              key={ids?.brandProfileId ?? brandProfile.website}
              profile={brandProfile}
              activationProfile={activationProfile}
              onContinue={handleActivationContinue}
              onTryAnother={reset}
              voice="you"
            />
          </div>
        )}

        {status === "intent" && brandProfile && (
          <div className="flex min-h-0 flex-1 flex-col">
            <DiscoveryIntent
              defaultPromoteFirst={defaultPromoteFirst}
              foundAudience={foundAudience}
              foundOffer={foundOffer}
              foundPresence={foundPresence}
              detectedLocations={detectedLocations}
              onContinue={submitIntent}
              onBack={goToResult}
            />
            {error ? (
              <p className="mt-3 shrink-0 text-sm text-danger" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        )}

        {status === "generating_strategy" && intentAnswers && (
          <div className="flex min-h-0 flex-1 flex-col">
            <DiscoveryGeneratingStrategy answers={intentAnswers} />
          </div>
        )}

        {status === "strategy" &&
          strategyPreview &&
          brandProfile &&
          intentAnswers && (
            <div className="flex min-h-0 flex-1 flex-col">
              <DiscoveryStrategyPreview
                strategy={strategyPreview}
                businessName={brandProfile.businessName}
                pageCount={pageCount}
                intent={intentAnswers}
                brandProfile={brandProfile}
                ids={ids}
                onEditPriorities={goToResult}
              />
            </div>
          )}
      </div>
    </article>
  );
}
