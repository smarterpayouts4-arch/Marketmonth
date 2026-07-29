import { ContentFlowBackground } from "@/components/landing/content-flow-background";
import { ContentUniverseBackground } from "@/components/landing/content-universe-background";
import { ContentUniverseSection } from "@/components/landing/content-universe";
import { DemoTheater } from "@/components/landing/demo-theater";
import { FeatureSection } from "@/components/landing/feature-section";
import { FinalCTA } from "@/components/landing/final-cta";
import { HeroLanding } from "@/components/landing/hero-landing";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import {
  freeAnalysisLine,
  processLabel,
} from "@/components/landing/landing-copy";
import { OutcomeStats } from "@/components/landing/outcome-stats";
import { ProcessStrip } from "@/components/landing/process-strip";
import { PRODUCT_IDENTITY } from "@/seo/config/product-identity";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNavbar />
      <main>
        <div className="relative overflow-x-clip">
          <ContentUniverseBackground />
          <div className="relative z-10">
            <HeroLanding />
            <ContentUniverseSection />
          </div>
        </div>

        <div className="relative overflow-hidden">
          <ContentFlowBackground />
          <div className="relative z-10">
            <DemoTheater />
            <ProcessStrip />
            <FeatureSection />
            <OutcomeStats />
          </div>
        </div>
        <FinalCTA />
      </main>
      <footer className="border-t border-border/80 py-10">
        <div className="mx-auto flex max-w-[1280px] flex-col items-start justify-between gap-3 px-5 sm:flex-row sm:items-center sm:px-8 lg:px-12">
          <div>
            <p className="font-display text-base font-semibold tracking-[-0.02em] text-foreground">
              {PRODUCT_IDENTITY.displayName}
            </p>
            <p className="mt-1 text-[13px] font-medium tracking-wide text-text-muted">
              {processLabel}
            </p>
          </div>
          <p className="max-w-[36ch] text-sm text-text-muted sm:text-right">
            {freeAnalysisLine}
          </p>
        </div>
      </footer>
    </div>
  );
}
