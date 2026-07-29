import Link from "next/link";

import { Reveal } from "@/components/landing/reveal";

export function FinalCTA() {
  return (
    <section className="pb-20 sm:pb-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-[1.75rem] bg-primary-dark px-6 py-14 text-center sm:px-12 sm:py-16">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background: `
                  radial-gradient(ellipse 60% 70% at 50% -10%, color-mix(in oklch, var(--accent) 35%, transparent), transparent 60%),
                  radial-gradient(ellipse 40% 50% at 100% 100%, color-mix(in oklch, var(--primary) 40%, transparent), transparent 55%)
                `,
              }}
            />
            <div className="relative mx-auto max-w-2xl">
              <h2 className="font-display text-balance text-[clamp(1.85rem,3.2vw,2.75rem)] font-bold tracking-[-0.035em] text-primary-foreground">
                Ready to turn your website into a month of marketing?
              </h2>
              <p className="mx-auto mt-4 max-w-[40ch] text-[1.05rem] leading-relaxed text-primary-foreground/78">
                Walk Learn → Strategize → Build → Review on your own brand
                path — starting with your website.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="#analyze"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-accent px-7 text-[0.95rem] font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
                >
                  Analyze my website
                </Link>
                <Link
                  href="#demo-theater"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-primary-foreground/25 bg-transparent px-7 text-[0.95rem] font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/10"
                >
                  See it work
                </Link>
              </div>
              <p className="mt-5 text-sm text-primary-foreground/50">
                Prototype mode · No payment required
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
