"use client";

import { MARKETING_TOPIC_HEADING } from "./copy";

type MarketingTopicHeaderProps = {
  compact?: boolean;
};

export function MarketingTopicHeader({
  compact = false,
}: MarketingTopicHeaderProps) {
  return (
    <header className="min-w-0">
      <h1
        className={
          compact
            ? "font-display text-[clamp(1.45rem,2.2vw,1.85rem)] font-bold leading-[1.1] tracking-[-0.03em] text-foreground"
            : "font-display text-[clamp(1.85rem,3.2vw,2.55rem)] font-bold leading-[1.08] tracking-[-0.035em] text-foreground"
        }
      >
        {MARKETING_TOPIC_HEADING}
      </h1>
    </header>
  );
}
