import {
  capabilityBoundaryHeading,
  capabilityBoundarySubhead,
  landingCopy,
} from "@/components/landing/landing-copy";
import { Reveal } from "@/components/landing/reveal";

export function OutcomeStats() {
  return (
    <section className="border-y border-border/80 bg-subtle/50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <div className="flex flex-wrap items-baseline gap-3">
            <p className="font-display text-sm font-semibold text-primary">
              Capability boundary
            </p>
            <span className="text-xs font-medium text-text-muted">
              Honest · Not performance metrics
            </span>
          </div>
          <h2 className="text-section mt-3 text-foreground">
            {capabilityBoundaryHeading}
          </h2>
          <p className="mt-3 max-w-[48ch] text-[1.02rem] leading-relaxed text-text-secondary">
            {capabilityBoundarySubhead}
          </p>
        </Reveal>

        <div className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-6">
          {landingCopy.illustrativeStats.map((stat) => (
            <Reveal key={stat.label}>
              <div className="border-t border-border pt-5 text-left">
                <p className="font-display text-[2.35rem] font-bold tracking-[-0.04em] text-primary">
                  {stat.value}
                </p>
                <p className="mt-2 text-base font-semibold text-foreground">
                  {stat.label}
                </p>
                <p className="mt-1 text-sm text-text-muted">{stat.note}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
