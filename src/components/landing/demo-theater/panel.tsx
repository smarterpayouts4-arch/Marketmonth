import { Pause, Play } from "lucide-react";
import Image from "next/image";

import { demoTheater } from "@/components/landing/data/mock-landing-demo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TheaterPanelProps = {
  playing: boolean;
  visibleWeeks: number;
  progress: number;
  onToggle: () => void;
};

export function TheaterPanel({
  playing,
  visibleWeeks,
  progress,
  onToggle,
}: TheaterPanelProps) {
  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-border/90 bg-card shadow-lift ring-1 ring-foreground/5">
      <div className="border-b border-border/80 bg-card px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-semibold tracking-[-0.02em] text-foreground">
              {demoTheater.title}
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              {demoTheater.coreIdeas} Core Ideas{" "}
              <span className="text-text-muted">→</span>{" "}
              {demoTheater.totalAssets} Assets
            </p>
          </div>
          <Button
            type="button"
            onClick={onToggle}
            className="h-10 gap-2 rounded-xl bg-accent px-4 font-semibold text-accent-foreground hover:bg-accent/90"
          >
            {playing ? (
              <>
                <Pause className="size-4" /> Pause
              </>
            ) : (
              <>
                <Play className="size-4" /> Play
              </>
            )}
          </Button>
        </div>

        <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {demoTheater.channels.map((channel) => (
            <li
              key={channel.name}
              className="overflow-hidden rounded-xl border border-border bg-background"
            >
              <div className="relative aspect-[5/3]">
                <Image
                  src={channel.image}
                  alt=""
                  fill
                  sizes="160px"
                  className="object-cover"
                />
              </div>
              <p className="px-2 py-1.5 text-center text-[11px] font-semibold text-foreground">
                {channel.name}{" "}
                <span className="text-primary">{channel.count}</span>
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-5">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-text-muted">
            {progress === 0
              ? "Press Play to build your month..."
              : progress < 100
                ? "Building your month..."
                : "August month ready"}
          </p>
        </div>
      </div>

      <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
        {demoTheater.weeks.map((week, index) => {
          const shown = index < visibleWeeks;
          return (
            <div
              key={week.label}
              className={cn(
                "overflow-hidden rounded-xl border border-border bg-background transition-all duration-500",
                shown
                  ? "translate-y-0 opacity-100"
                  : "translate-y-2 opacity-40"
              )}
            >
              <div className="relative aspect-[16/9]">
                <Image
                  src={week.image}
                  alt=""
                  fill
                  sizes="220px"
                  className={cn(
                    "object-cover transition-all duration-500",
                    shown ? "grayscale-0" : "grayscale"
                  )}
                />
              </div>
              <div className="p-3">
                <p className="font-display text-xs font-semibold text-accent">
                  {week.label}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {week.items.map((item) => (
                    <li
                      key={item}
                      className={cn(
                        "rounded-lg px-2 py-1.5 text-xs leading-snug",
                        shown
                          ? "bg-subtle text-foreground"
                          : "bg-muted/50 text-text-muted"
                      )}
                    >
                      {shown ? item : "—"}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
