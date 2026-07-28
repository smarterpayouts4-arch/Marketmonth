"use client";

import { Reveal } from "@/components/landing/reveal";
import { TheaterIntro } from "./demo-theater/intro";
import { TheaterPanel } from "./demo-theater/panel";
import { useWeekTimer } from "./demo-theater/week-timer";

export function DemoTheater() {
  const { playing, visibleWeeks, progress, toggle } = useWeekTimer();

  return (
    <section id="demo-theater" className="scroll-mt-20 bg-background py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <TheaterIntro />
        </Reveal>

        <Reveal className="mt-10">
          <TheaterPanel
            playing={playing}
            visibleWeeks={visibleWeeks}
            progress={progress}
            onToggle={toggle}
          />
        </Reveal>
      </div>
    </section>
  );
}
