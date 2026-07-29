"use client";

import { useRef } from "react";

import { MonthPlan } from "@/components/landing/month-plan/month-plan";

import { useAutoPlay } from "./use-auto-play";

type TheaterPanelProps = {
  playing: boolean;
  visibleWeeks: number;
  onToggle: () => void;
  onPlay: () => void;
};

export function TheaterPanel({
  playing,
  visibleWeeks,
  onToggle,
  onPlay,
}: TheaterPanelProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useAutoPlay(rootRef, onPlay);

  return (
    <div ref={rootRef} data-schedule-ready="true">
      <MonthPlan playing={playing} visibleWeeks={visibleWeeks} onToggle={onToggle} />
    </div>
  );
}
