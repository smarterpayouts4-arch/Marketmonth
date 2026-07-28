import { useEffect, useRef, useState } from "react";

import { demoTheater } from "@/components/landing/data/mock-landing-demo";
import { WEEK_STEP_MS } from "./constants";

export function useWeekTimer() {
  const [playing, setPlaying] = useState(false);
  const [visibleWeeks, setVisibleWeeks] = useState(0);
  const [progress, setProgress] = useState(0);
  const timersRef = useRef<number[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  useEffect(() => () => clearTimers(), []);

  const reset = () => {
    clearTimers();
    setPlaying(false);
    setVisibleWeeks(0);
    setProgress(0);
  };

  const play = () => {
    clearTimers();
    setPlaying(true);
    setVisibleWeeks(0);
    setProgress(8);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches;
    if (reduced) {
      setVisibleWeeks(demoTheater.weeks.length);
      setProgress(100);
      setPlaying(false);
      return;
    }

    demoTheater.weeks.forEach((_, index) => {
      const id = window.setTimeout(() => {
        setVisibleWeeks(index + 1);
        setProgress(((index + 1) / demoTheater.weeks.length) * 100);
        if (index === demoTheater.weeks.length - 1) {
          setPlaying(false);
        }
      }, WEEK_STEP_MS * (index + 1));
      timersRef.current.push(id);
    });
  };

  const toggle = () => {
    if (playing) {
      reset();
      return;
    }
    play();
  };

  return { playing, visibleWeeks, progress, toggle };
}
