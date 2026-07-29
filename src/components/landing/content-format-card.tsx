import { cn } from "@/lib/utils";
import {
  ACCENT_TONES,
  SEQUENCE_LOOP_S,
  SEQUENCE_STEP_S,
  type ContentFormat,
} from "@/components/landing/content-universe/formats";

type ContentFormatCardProps = {
  format: ContentFormat;
  className?: string;
};

/** Small decorative upward trend line — reinforces "distributing now"
 * without implying a specific real value. */
function TrendSquiggle({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 16"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M1 13 L11 9 L18 11.5 L27 5 L34 7.5 L47 2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** One illustrative output tile in the Content Flow diagram. All five share
 * this component and this card's fixed internal rhythm — a CSS Grid row
 * stretches them to equal height, so nothing here needs manual sizing. */
export function ContentFormatCard({
  format,
  className,
}: ContentFormatCardProps) {
  const tone = ACCENT_TONES[format.accent];
  const Icon = format.icon;

  return (
    <li
      className={cn(
        "relative flex min-h-[132px] flex-col items-center gap-1.5 rounded-2xl border border-border bg-card px-3 py-4 text-center shadow-soft animate-soft-pulse",
        className
      )}
      style={{
        animationDuration: `${SEQUENCE_LOOP_S}s`,
        animationDelay: `${(format.sequence - 1) * SEQUENCE_STEP_S}s`,
      }}
    >
      <span
        className="absolute left-3 top-3 text-[11px] font-semibold tabular-nums text-text-muted"
        aria-hidden="true"
      >
        {String(format.sequence).padStart(2, "0")}
      </span>

      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-full",
          tone.iconBg
        )}
        aria-hidden="true"
      >
        <Icon className={cn("size-4", tone.iconText)} />
      </span>

      <p className="mt-1 font-display text-[15px] font-semibold tabular-nums tracking-tight text-foreground">
        {format.metric}{" "}
        <span className="text-[9px] font-semibold tracking-[0.06em] text-text-muted uppercase">
          {format.metricLabel}
        </span>
      </p>

      <TrendSquiggle className={cn("h-4 w-12", tone.trend)} />

      <span className="text-[12px] font-medium text-text-secondary">
        {format.label}
      </span>
    </li>
  );
}
