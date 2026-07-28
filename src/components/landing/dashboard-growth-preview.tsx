import { BarChart3, Play, TrendingUp, Users } from "lucide-react";

import { growthPreview } from "@/components/landing/data/mock-landing-demo";

const statIcons = {
  trend: TrendingUp,
  users: Users,
  play: Play,
  bars: BarChart3,
} as const;

/** Illustrative growth chart — matched height with Publish & learn. */
export function DashboardGrowthPreview() {
  const { months, values, callout, stats, disclaimer } = growthPreview;
  const width = 440;
  const height = 160;
  const padX = 28;
  const padY = 18;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;
  const max = 100;
  const points = values.map((value, index) => {
    const x = padX + (index / (values.length - 1)) * chartW;
    const y = padY + chartH - (value / max) * chartH;
    return { x, y, value, month: months[index] };
  });
  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `${padX},${padY + chartH} ${polyline} ${padX + chartW},${padY + chartH}`;
  const last = points[points.length - 1];

  return (
    <div className="flex h-full min-h-[280px] flex-col overflow-hidden rounded-[1.25rem] border border-border bg-card shadow-soft">
      <div className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
        <div>
          <p className="font-display text-[0.78rem] font-semibold text-primary">
            Your marketing engine
          </p>
          <p className="mt-0.5 text-sm text-text-secondary">
            Brand → strategy → month of content
          </p>
        </div>
        <span className="text-[11px] font-medium text-text-muted">Preview</span>
      </div>

      <div className="relative mx-4 mt-3 flex-1 rounded-xl border border-border bg-background px-2 pb-2 pt-3 sm:mx-5">
        <div className="mb-1 flex items-center justify-between px-2">
          <p className="text-xs font-semibold text-foreground">Growth over time</p>
          <span className="rounded-md border border-border bg-card px-2 py-0.5 text-[10px] text-text-muted">
            Last 6 months
          </span>
        </div>

        <div className="relative">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-[140px] w-full text-primary"
            role="img"
            aria-label="Illustrative growth chart trending upward over six months"
          >
            {[0, 25, 50, 75, 100].map((tick) => {
              const y = padY + chartH - (tick / max) * chartH;
              return (
                <g key={tick}>
                  <line
                    x1={padX}
                    x2={padX + chartW}
                    y1={y}
                    y2={y}
                    stroke="currentColor"
                    strokeOpacity={0.08}
                    strokeWidth={1}
                  />
                  <text
                    x={padX - 8}
                    y={y + 3}
                    textAnchor="end"
                    fill="var(--text-muted)"
                    fontSize="10"
                  >
                    {tick}
                  </text>
                </g>
              );
            })}
            <polygon points={area} className="fill-primary" fillOpacity={0.08} />
            <polyline
              points={polyline}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {points.map((point) => (
              <circle
                key={point.month}
                cx={point.x}
                cy={point.y}
                r={point === last ? 4.5 : 3}
                className="fill-primary stroke-card"
                strokeWidth={2}
              />
            ))}
            {months.map((month, index) => (
              <text
                key={month}
                x={points[index].x}
                y={height - 2}
                textAnchor="middle"
                fill="var(--text-muted)"
                fontSize="10"
              >
                {month}
              </text>
            ))}
          </svg>

          <div className="pointer-events-none absolute top-2 right-2 flex max-w-[12rem] items-center gap-1.5 rounded-full border border-primary/25 bg-card px-2.5 py-1 text-[11px] font-semibold text-primary shadow-soft sm:right-3 sm:top-2">
            <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
            {callout}
          </div>
        </div>
        <p className="px-2 pt-1 text-[10px] text-text-muted">{disclaimer}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-border p-3 sm:grid-cols-4 sm:gap-2 sm:p-4">
        {stats.map((stat) => {
          const Icon = statIcons[stat.icon];
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-border bg-background px-2.5 py-2.5"
            >
              <Icon className="size-3.5 text-primary" aria-hidden />
              <p className="font-display mt-1.5 text-base font-semibold tracking-[-0.02em] text-foreground">
                {stat.value}
              </p>
              <p className="text-[10px] leading-snug text-text-muted">{stat.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
