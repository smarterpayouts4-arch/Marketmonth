import {
  landingCopy,
  whatYouGetEyebrow,
  whatYouGetHeading,
  whyDifferentEyebrow,
  whyDifferentHeading,
} from "@/components/landing/landing-copy";
import { Reveal } from "@/components/landing/reveal";

export function FeatureSection() {
  return (
    <section className="border-y border-border/80 bg-card/35 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl space-y-20 px-4 sm:px-6">
        <div>
          <Reveal>
            <p className="font-display text-sm font-semibold text-primary">
              {whyDifferentEyebrow}
            </p>
            <h2 className="text-section mt-3 max-w-[18ch] text-foreground">
              {whyDifferentHeading}
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-x-12 gap-y-8 sm:grid-cols-2">
            {landingCopy.differentiators.map((item, index) => (
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
              {whatYouGetEyebrow}
            </p>
            <h2 className="text-section mt-3 text-foreground">
              {whatYouGetHeading}
            </h2>
          </Reveal>
          <Reveal className="mt-8">
            <ul className="divide-y divide-border border-y border-border">
              {landingCopy.whatYouGet.map((item) => (
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
