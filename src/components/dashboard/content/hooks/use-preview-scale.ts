"use client";

import { useLayoutEffect, useRef, useState } from "react";

export function computePreviewScale(
  availableWidth: number,
  availableHeight: number,
  logicalWidth: number,
  logicalHeight: number
): number {
  if (
    availableWidth <= 0 ||
    availableHeight <= 0 ||
    logicalWidth <= 0 ||
    logicalHeight <= 0
  ) {
    return 1;
  }
  return Math.min(
    availableWidth / logicalWidth,
    availableHeight / logicalHeight,
    1
  );
}

export function usePreviewScale(
  logicalWidth: number,
  logicalHeight: number
): {
  containerRef: React.RefObject<HTMLDivElement | null>;
  scale: number;
  scaledWidth: number;
  scaledHeight: number;
} {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      setScale(
        computePreviewScale(width, height, logicalWidth, logicalHeight)
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [logicalWidth, logicalHeight]);

  return {
    containerRef,
    scale,
    scaledWidth: logicalWidth * scale,
    scaledHeight: logicalHeight * scale,
  };
}
