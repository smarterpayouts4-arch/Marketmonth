import Image from "next/image";

import { landingImagery } from "@/components/landing/data/mock-landing-demo";

export function TheaterIntro() {
  return (
    <div className="grid items-end gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <div>
        <p className="font-display text-sm font-semibold text-primary">
          What you actually get
        </p>
        <h2 className="text-section mt-3 max-w-[14ch] text-foreground">
          Watch a month take shape
        </h2>
        <p className="mt-4 max-w-[42ch] text-[1.05rem] leading-relaxed text-text-secondary">
          Not another Discovery scan — a visual August month: ideas become
          TikTok, Instagram, YouTube, and more.
        </p>
      </div>
      <div className="relative hidden aspect-[16/10] overflow-hidden rounded-[1.25rem] border border-border shadow-soft lg:block">
        <Image
          src={landingImagery.planning}
          alt=""
          fill
          sizes="480px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 via-foreground/10 to-transparent" />
        <p className="font-display absolute right-4 bottom-4 left-4 text-sm font-semibold text-primary-foreground">
          Strategize → Build → Review a full month
        </p>
      </div>
    </div>
  );
}
