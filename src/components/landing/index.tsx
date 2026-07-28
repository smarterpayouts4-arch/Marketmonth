import { DemoTheater } from "@/components/landing/demo-theater";
import { FeatureSection } from "@/components/landing/feature-section";
import { FinalCTA } from "@/components/landing/final-cta";
import { HeroLanding } from "@/components/landing/hero-landing";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { OutcomeStats } from "@/components/landing/outcome-stats";
import { ProcessStrip } from "@/components/landing/process-strip";
import { SocialProof } from "@/components/landing/social-proof";
import { PRODUCT_IDENTITY } from "@/seo/config/product-identity";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNavbar />
      <main>
        <HeroLanding />
        <ProcessStrip />
        <DemoTheater />
        <FeatureSection />
        <SocialProof />
        <OutcomeStats />
        <HowItWorks />
        <FinalCTA />
      </main>
      <footer className="border-t border-border/80 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-4 sm:flex-row sm:items-center sm:px-6">
          <p className="font-display text-base font-semibold tracking-[-0.02em] text-foreground">
            {PRODUCT_IDENTITY.displayName}
          </p>
          <p className="text-sm text-text-muted">
            Prototype landing · Design tokens from globals
          </p>
        </div>
      </footer>
    </div>
  );
}
