"use client";

import type { ReactNode } from "react";

type ContentStudioHeaderProps = {
  actions?: ReactNode;
};

export function ContentStudioHeader({ actions }: ContentStudioHeaderProps) {
  return (
    <header className="flex shrink-0 items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl leading-tight font-semibold tracking-tight text-foreground sm:text-[1.45rem]">
          Content Production Studio
        </h1>
        <p className="mt-0.5 text-xs text-text-secondary sm:text-sm">
          Preview and refine one idea across every channel.
        </p>
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
