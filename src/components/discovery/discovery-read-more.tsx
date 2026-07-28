"use client";

import type { ReactNode } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type DiscoveryReadMoreProps = {
  title: string;
  triggerLabel: string;
  /** When false, only the preview renders — no expand control. */
  overflow: boolean;
  preview?: ReactNode;
  children: ReactNode;
  description?: string;
  className?: string;
};

/**
 * Overflow-only progressive disclosure for the Discovery landing card.
 * Trigger is omitted unless `overflow` is true.
 */
export function DiscoveryReadMore({
  title,
  triggerLabel,
  overflow,
  preview,
  children,
  description = "Full details from your Discovery preview.",
  className,
}: DiscoveryReadMoreProps) {
  if (!overflow) {
    return <div className={className}>{preview}</div>;
  }

  return (
    <div className={cn("min-w-0", className)}>
      {preview}
      <Sheet>
        <SheetTrigger className="mt-1.5 text-left text-xs font-medium text-primary underline-offset-2 hover:underline">
          {triggerLabel}
        </SheetTrigger>
        <SheetContent
          side="bottom"
          showCloseButton
          className={cn(
            "flex flex-col gap-0 border-border bg-card p-0 text-card-foreground shadow-lift",
            /* Mobile: near-full-height bottom sheet */
            "data-[side=bottom]:max-h-[92vh] data-[side=bottom]:rounded-t-2xl",
            /* Desktop: centered dialog */
            "lg:data-[side=bottom]:inset-auto lg:data-[side=bottom]:top-1/2 lg:data-[side=bottom]:left-1/2 lg:data-[side=bottom]:bottom-auto lg:data-[side=bottom]:h-auto lg:data-[side=bottom]:max-h-[80vh] lg:data-[side=bottom]:w-[min(100%,720px)] lg:data-[side=bottom]:-translate-x-1/2 lg:data-[side=bottom]:-translate-y-1/2 lg:data-[side=bottom]:rounded-2xl lg:data-[side=bottom]:border lg:data-[side=bottom]:data-ending-style:translate-y-[-45%] lg:data-[side=bottom]:data-starting-style:translate-y-[-45%]"
          )}
        >
          <SheetHeader className="shrink-0 border-b border-border/80 px-5 py-4 pr-12">
            <SheetTitle className="font-display text-lg font-semibold tracking-[-0.02em] text-primary">
              {title}
            </SheetTitle>
            <SheetDescription className="text-sm text-text-secondary">
              {description}
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
