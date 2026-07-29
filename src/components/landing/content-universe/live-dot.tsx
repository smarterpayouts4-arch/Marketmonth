import { cn } from "@/lib/utils";

/**
 * Small pulsing status dot for "live" indicators (header badge, footer
 * status line). Built from Tailwind's built-in `animate-ping`, so
 * `motion-reduce:hidden` disables only the ring — the solid dot underneath
 * stays visible, keeping the live-status indicator readable without motion.
 */
export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex size-2", className)}>
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-success/60 motion-reduce:hidden" />
      <span className="relative inline-flex size-2 rounded-full bg-success" />
    </span>
  );
}
