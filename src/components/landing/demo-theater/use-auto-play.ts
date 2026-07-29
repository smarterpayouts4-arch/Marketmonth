import { type RefObject, useEffect, useRef } from "react";

/**
 * Fire `play()` once when `ref.current` scrolls into view.
 * Disconnects after the first intersection.
 */
export function useAutoPlay(
  ref: RefObject<HTMLElement | null>,
  play: () => void,
  enabled = true
) {
  const playRef = useRef(play);
  const firedRef = useRef(false);

  useEffect(() => {
    playRef.current = play;
  }, [play]);

  useEffect(() => {
    if (!enabled || firedRef.current) return;

    let observer: IntersectionObserver | null = null;
    let raf = 0;
    let cancelled = false;

    const fire = () => {
      if (firedRef.current || cancelled) return;
      firedRef.current = true;
      playRef.current();
      observer?.disconnect();
    };

    const attach = () => {
      const node = ref.current;
      if (!node || cancelled) return;

      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting) return;
          fire();
        },
        { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
      );
      observer.observe(node);
    };

    // Ref is usually ready before effects; rAF covers the rare miss.
    if (ref.current) {
      attach();
    } else {
      raf = window.requestAnimationFrame(attach);
    }

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      observer?.disconnect();
    };
  }, [ref, enabled]);
}
