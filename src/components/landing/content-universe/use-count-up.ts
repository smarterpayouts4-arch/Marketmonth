"use client";

import { useEffect, useState } from "react";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function useCountUp(
  target: number,
  durationMs: number,
  delayMs: number
) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let raf = 0;

    if (prefersReducedMotion()) {
      const id = window.setTimeout(() => setValue(target), 0);
      return () => window.clearTimeout(id);
    }

    let startAt = 0;
    const delay = window.setTimeout(() => {
      startAt = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - startAt) / durationMs);
        const eased = 1 - (1 - t) ** 3;
        setValue(target * eased);
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delayMs);

    return () => {
      window.clearTimeout(delay);
      cancelAnimationFrame(raf);
    };
  }, [target, durationMs, delayMs]);

  return value;
}
