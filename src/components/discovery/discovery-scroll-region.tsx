"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

type DiscoveryScrollRegionProps = {
  children: ReactNode;
  className?: string;
  /** Accessible name for the scrollable region when useful. */
  "aria-label"?: string;
  /** When this changes, scroll position resets to the top of the reveal. */
  scrollKey?: string | number;
};

/**
 * Single vertical scroll region for Discovery card body content.
 * Subtle fade appears only when more content remains below.
 */
export function DiscoveryScrollRegion({
  children,
  className,
  "aria-label": ariaLabel,
  scrollKey,
}: DiscoveryScrollRegionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);
  const [atBottom, setAtBottom] = useState(true);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const overflow = el.scrollHeight > el.clientHeight + 1;
    const bottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
    setCanScroll(overflow);
    setAtBottom(!overflow || bottom);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    const onScroll = () => update();
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [update, children]);

  useEffect(() => {
    const el = ref.current;
    if (!el || scrollKey === undefined) return;
    el.scrollTop = 0;
    update();
  }, [scrollKey, update]);

  return (
    <div className={cn("relative min-h-0 flex-1", className)}>
      <div
        ref={ref}
        aria-label={ariaLabel}
        className={cn(
          "discovery-scroll h-full overflow-x-hidden overflow-y-auto overscroll-contain",
          "[scrollbar-gutter:stable]"
        )}
        onScroll={update}
      >
        {children}
      </div>
      {canScroll && !atBottom ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card to-transparent"
        />
      ) : null}
    </div>
  );
}
