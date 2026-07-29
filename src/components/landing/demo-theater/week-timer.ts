import { useCallback, useEffect, useRef, useState } from "react";

import { WEEK_STEP_MS } from "./constants";

export function useWeekTimer(weekCount: number) {
  const [playing, setPlaying] = useState(false);
  const [visibleWeeks, setVisibleWeeks] = useState(0);
  const [progress, setProgress] = useState(0);
  const timersRef = useRef<number[]>([]);
  const playingRef = useRef(playing);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const play = useCallback(() => {
    clearTimers();
    setPlaying(true);
    setVisibleWeeks(0);
    setProgress(8);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches;
    if (reduced) {
      setVisibleWeeks(weekCount);
      setProgress(100);
      setPlaying(false);
      return;
    }

    Array.from({ length: weekCount }).forEach((_, index) => {
      const id = window.setTimeout(() => {
        setVisibleWeeks(index + 1);
        setProgress(((index + 1) / weekCount) * 100);
        if (index === weekCount - 1) {
          setPlaying(false);
        }
      }, WEEK_STEP_MS * (index + 1));
      timersRef.current.push(id);
    });
  }, [clearTimers, weekCount]);

  const toggle = useCallback(() => {
    if (playingRef.current) {
      clearTimers();
      setPlaying(false);
      setVisibleWeeks(0);
      setProgress(0);
      return;
    }
    play();
  }, [clearTimers, play]);

  return { playing, visibleWeeks, progress, play, toggle };
}
