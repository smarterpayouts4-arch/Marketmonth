"use client";

import type { ReactNode } from "react";

export function StatusBadge({
  tone,
  children,
  testId,
}: {
  tone: "success" | "neutral" | "danger" | "muted" | "warning";
  children: ReactNode;
  testId?: string;
}) {
  return (
    <span
      className={`studio-asset-badge studio-asset-badge--${tone}`}
      data-testid={testId}
    >
      {children}
    </span>
  );
}
