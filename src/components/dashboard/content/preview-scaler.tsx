"use client";

import type { ReactNode } from "react";

import { usePreviewScale } from "./hooks/use-preview-scale";

type PreviewScalerProps = {
  logicalWidth: number;
  logicalHeight: number;
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
};

/**
 * Renders platform previews at true logical size, then scales them into
 * the available viewer frame. Does not scale page chrome or typography.
 */
export function PreviewScaler({
  logicalWidth,
  logicalHeight,
  children,
  className,
  "aria-label": ariaLabel = "Platform preview",
}: PreviewScalerProps) {
  const { containerRef, scale, scaledWidth, scaledHeight } = usePreviewScale(
    logicalWidth,
    logicalHeight
  );

  return (
    <div
      ref={containerRef}
      className={className}
      aria-label={ariaLabel}
      data-preview-scale={scale.toFixed(3)}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: scaledWidth,
          height: scaledHeight,
          position: "relative",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: logicalWidth,
            height: logicalHeight,
            transform: `scale(${scale})`,
            transformOrigin: "top center",
            position: "absolute",
            top: 0,
            left: "50%",
            marginLeft: -logicalWidth / 2,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
