import { illustrativeProof } from "@/components/landing/data/mock-landing-demo";
import { Reveal } from "@/components/landing/reveal";

export function SocialProof() {
  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <div className="flex flex-wrap items-baseline gap-3">
            <p className="font-display text-sm font-semibold text-primary">
              Social proof
            </p>
            <span className="text-xs font-medium text-text-muted">
              Illustrative · Demo example
            </span>
          </div>
          <h2 className="text-section mt-3 max-w-[18ch] text-foreground">
            Placeholder stories for layout only
          </h2>
          <p className="mt-4 max-w-[48ch] text-[1.02rem] leading-relaxed text-text-secondary">
            {illustrativeProof.disclaimer}
          </p>
        </Reveal>

        <div className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
          {illustrativeProof.quotes.map((item) => (
            <Reveal key={item.attribution}>
              <figure className="border-t border-border pt-5">
                <blockquote className="text-[1.02rem] leading-relaxed text-text-secondary">
                  “{item.quote}”
                </blockquote>
                <figcaption className="mt-4 text-sm font-medium text-text-muted">
                  {item.attribution}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
