"use client";

import {
  toStrategyIntentAnswers,
  type DiscoveryInvestments,
} from "@/components/discovery/activation";
import { DiscoveryForm } from "@/components/discovery/discovery-form";
import { DiscoveryGeneratingStrategy } from "@/components/discovery/discovery-generating-strategy";
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
    discoveryNarrative,
    strategyPreview,
    pageCount,
    intentAnswers,
    ids,
    defaultPromoteFirst,
    analyze,
    goToResult,
    submitIntent,
    reset,
  } = useDiscovery({ onPreviewBrandChange });

  function handleActivationContinue(investments: DiscoveryInvestments) {
    const pillarLabel = discoveryNarrative?.contentPillars.find(
      (p) => p.id === investments.pillarId
    )?.name;
    const answers = toStrategyIntentAnswers(investments, {
      reach: "online_broad",
      fallbackPromoteFirst: defaultPromoteFirst,
      pillarLabel,
    });
    void submitIntent(answers, investments);
  }

  const isResultFlow = status === "result";

  return (
    <article
      className={cn(
        "discovery-card-shell w-full rounded-[1.4rem] border border-border/90 bg-card shadow-discovery ring-1 ring-foreground/5",
        isResultFlow && "discovery-card-shell--grow"
      )}
    >
      {status !== "result" && status !== "empty" && status !== "error" ? (
        <header className="shrink-0">
          <DiscoveryProgress status={status} />
        </header>
      ) : null}

      <div className="discovery-card-body flex min-h-0 flex-1 flex-col px-5 py-5 sm:px-6 sm:py-6">
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

        {status === "result" && brandProfile && discoveryNarrative && (
          <div className="flex flex-1 flex-col">
            <DiscoveryResults
              key={ids?.brandProfileId ?? brandProfile.website}
              profile={brandProfile}
              discoveryNarrative={discoveryNarrative}
              onContinue={handleActivationContinue}
              onTryAnother={reset}
              voice="you"
            />
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
