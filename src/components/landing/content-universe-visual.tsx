"use client";

import { cn } from "@/lib/utils";

import {
  FORMATS,
  formatMetric,
  type FormatItem,
} from "@/components/landing/content-universe/formats";
import { useCountUp } from "@/components/landing/content-universe/use-count-up";

const COUNT = FORMATS.length;

/** Continuous trunk → bar → stems in viewBox 0 0 1000 120. */
function connectorPath(): string {
  const trunkX = 500;
  const barY = 36;
  const stemEnd = 108;
  const xs = Array.from({ length: COUNT }, (_, i) => ((i + 0.5) / COUNT) * 1000);
  const left = xs[0] ?? trunkX;
  const stems = xs
    .map(
      (x, i) =>
        `V ${stemEnd} V ${barY}${i < COUNT - 1 ? ` H ${xs[i + 1]}` : ""}`
    )
    .join("");
  return `M ${trunkX} 0 V ${barY} H ${left} ${stems}`;
}

const CONNECTOR_D = connectorPath();

function PlatformNode({
  format,
  index,
}: {
  format: FormatItem;
  index: number;
}) {
  const value = useCountUp(format.target, 1800, 200 + index * 80);

  return (
    <li
      className="cu-node-in flex min-w-0 flex-col items-center text-center"
      style={{ animationDelay: `${100 + index * 40}ms` }}
    >
      <span
        className={cn(
          "flex size-7 items-center justify-center rounded-full sm:size-8",
          format.tone
        )}
        title={format.label}
        aria-hidden
      >
        <format.Icon className="size-3 sm:size-3.5" />
      </span>
      <span className="sr-only">
        {format.label}: {format.metric}
      </span>
      <strong
        className="cu-metric-tick mt-1.5 font-mono text-[10px] font-semibold leading-none tabular-nums tracking-tight text-foreground sm:text-[11px]"
        aria-hidden
      >
        {formatMetric(value)}
      </strong>
      <span className="mt-0.5 text-[8px] font-semibold leading-none tracking-[0.06em] text-text-muted uppercase">
        {format.metric}
      </span>
    </li>
  );
}

/** One compact topic → formats diagram (HTML nodes + SVG lines only). */
export function ContentUniverseVisual() {
  return (
    <div className="content-universe-diagram flex flex-col">
      <p className="text-center text-xs font-semibold tracking-wide text-text-muted uppercase">
        One topic · Multiple formats
      </p>

      <div className="mt-9 flex justify-center sm:mt-10">
        <div className="rounded-xl border border-border/80 bg-background px-3.5 py-1.5 text-[13px] font-semibold text-primary">
          Marketing topic
        </div>
      </div>

      {/* Short connector band — desktop/tablet only */}
      <div className="relative mx-auto mt-1 hidden h-14 w-full max-w-none md:block">
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full text-border"
          viewBox="0 0 1000 120"
          fill="none"
          preserveAspectRatio="none"
        >
          <path
            d={CONNECTOR_D}
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <ul className="mt-5 grid grid-cols-3 gap-x-2 gap-y-4 md:mt-0 md:grid-cols-6 md:gap-x-1">
        {FORMATS.map((format, index) => (
          <PlatformNode key={format.id} format={format} index={index} />
        ))}
      </ul>
    </div>
  );
}
