"use client";

import { DiscoveryCard } from "@/components/discovery";
import {
  heroHeadline,
  heroSubhead,
  painLine,
  processSteps,
} from "@/components/landing/landing-copy";

export function HeroLanding() {
  return (
    <section className="relative overflow-visible bg-transparent">
      <div className="relative mx-auto max-w-[1280px] px-5 py-10 sm:px-8 sm:py-14 lg:px-12 lg:py-16">
        <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-[minmax(0,0.48fr)_minmax(0,0.52fr)] md:gap-12 lg:gap-14">
          <div className="flex min-h-0 flex-col justify-center animate-rise lg:min-h-[var(--discovery-card-min-height)]">
            <h1 className="text-hero-serif max-w-[20ch] text-foreground">
              {heroHeadline}
            </h1>
            <p className="mt-4 max-w-[42ch] text-[16px] leading-[1.55] text-text-secondary sm:text-[17px]">
              {heroSubhead}
            </p>
            <p className="mt-3 max-w-[40ch] text-[14px] leading-relaxed text-text-muted sm:text-[15px]">
              {painLine}
            </p>
            <p className="mt-5 text-[14px] font-medium tracking-wide text-text-secondary sm:text-[15px]">
              {processSteps.map((step, index) => (
                <span key={step.title}>
                  {index > 0 ? (
                    <span className="mx-2 text-text-muted">→</span>
                  ) : null}
                  <span
                    className={
                      index === 0 ? "text-primary" : "text-foreground"
                    }
                  >
                    {step.title}
                  </span>
                </span>
              ))}
            </p>
          </div>

          <div
            id="analyze"
            className="h-full min-h-0 w-full max-w-[var(--discovery-card-max-width)] justify-self-stretch scroll-mt-24 animate-rise-delay-2 md:justify-self-end"
          >
            <DiscoveryCard />
          </div>
        </div>
      </div>
    </section>
  );
}
