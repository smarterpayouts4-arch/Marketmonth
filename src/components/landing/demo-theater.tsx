"use client";

import { Reveal } from "@/components/landing/reveal";
import { augustMonthPlan } from "@/components/landing/month-plan/data";

import { TheaterPanel } from "./demo-theater/panel";
import { useWeekTimer } from "./demo-theater/week-timer";

/**
 * The monthly-plan intro copy now lives inside `MonthPlanIntroHeader`, as
 * the top band of the same card as the roadmap (see `month-plan.tsx`) —
 * intro and roadmap read as one unified module instead of a floating
 * heading above a separate panel.
 */
export function DemoTheater() {
  const { playing, visibleWeeks, play, toggle } = useWeekTimer(
    augustMonthPlan.length
  );

  return (
    <section id="demo-theater" className="scroll-mt-20 bg-background pt-6 pb-16 sm:pt-8 sm:pb-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <TheaterPanel
            playing={playing}
            visibleWeeks={visibleWeeks}
            onToggle={toggle}
            onPlay={play}
          />
        </Reveal>
      </div>
    </section>
  );
}
