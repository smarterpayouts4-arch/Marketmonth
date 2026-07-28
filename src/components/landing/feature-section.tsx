import {
  whatYouGet,
  whyDifferent,
} from "@/components/landing/data/mock-landing-demo";
import { Reveal } from "@/components/landing/reveal";

export function FeatureSection() {
  return (
    <section className="border-y border-border/80 bg-card/35 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl space-y-20 px-4 sm:px-6">
        <div>
          <Reveal>
            <p className="font-display text-sm font-semibold text-primary">
              Why it&apos;s different
            </p>
            <h2 className="text-section mt-3 max-w-[16ch] text-foreground">
              Clarity before content production
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-x-12 gap-y-8 sm:grid-cols-2">
            {whyDifferent.map((item, index) => (
              <Reveal key={item.title}>
                <div className="border-t border-border pt-5">
                  <p className="font-display text-xs font-semibold text-text-muted">
                    0{index + 1}
                  </p>
                  <h3 className="font-display mt-2 text-xl font-semibold tracking-[-0.02em] text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-2 max-w-[38ch] text-[0.98rem] leading-relaxed text-text-secondary">
                    {item.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <div>
          <Reveal>
            <p className="font-display text-sm font-semibold text-primary">
              What you get
            </p>
            <h2 className="text-section mt-3 text-foreground">
              From website to a monthly plan
            </h2>
          </Reveal>
          <Reveal className="mt-8">
            <ul className="divide-y divide-border border-y border-border">
              {whatYouGet.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-4 py-4 text-[1.02rem] font-medium text-foreground"
                >
                  <span
                    aria-hidden
                    className="size-1.5 shrink-0 rounded-full bg-accent"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
