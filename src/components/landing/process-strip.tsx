import { processSteps } from "@/components/landing/landing-copy";
import { Reveal } from "@/components/landing/reveal";

export function ProcessStrip() {
  return (
    <section className="border-y border-border/80 bg-card/40">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-display text-sm font-semibold text-primary">
              The journey
            </p>
            <h2 className="text-section mt-3 text-foreground">
              Simple on purpose
            </h2>
            <p className="mx-auto mt-3 max-w-[42ch] text-base leading-relaxed text-text-secondary">
              One clear path: discover what your site already knows, choose a
              direction, then build. No dashboard maze before value.
            </p>
          </div>
        </Reveal>

        <div className="relative mt-12 grid gap-10 sm:grid-cols-3 md:gap-8">
          <div
            aria-hidden
            className="pointer-events-none absolute top-[1.15rem] right-[12%] left-[12%] hidden h-px bg-border sm:block"
          />
          {processSteps.map((step, index) => (
            <Reveal key={step.title}>
              <div className="relative text-center md:text-left">
                <span className="font-display inline-flex size-9 items-center justify-center rounded-full border border-border bg-background text-sm font-bold text-primary shadow-soft">
                  {index + 1}
                </span>
                <h3 className="font-display mt-4 text-xl font-semibold tracking-[-0.02em] text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-[0.98rem] leading-relaxed text-text-secondary">
                  {step.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
