import {
  processLabel,
  processSteps,
} from "@/components/landing/landing-copy";
import { Reveal } from "@/components/landing/reveal";

export function HowItWorks() {
  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <p className="font-display text-sm font-semibold text-primary">
            How it works
          </p>
          <h2 className="text-section mt-3 max-w-[20ch] text-foreground">
            {processLabel}
          </h2>
        </Reveal>

        <ol className="mt-12 grid gap-10 sm:grid-cols-3 lg:gap-8">
          {processSteps.map((step, index) => (
            <Reveal key={step.title}>
              <li className="border-t border-border pt-5">
                <span className="font-display text-sm font-bold text-accent">
                  0{index + 1}
                </span>
                <h3 className="font-display mt-3 text-lg font-semibold tracking-[-0.02em] text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-[0.98rem] leading-relaxed text-text-secondary">
                  {step.body}
                </p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
