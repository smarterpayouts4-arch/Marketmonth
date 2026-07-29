import { ImageIcon } from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";

type MonthPlanImageProps = {
  src: string | null;
  alt: string;
  sizes: string;
  className?: string;
};

/**
 * Renders generated photography when `src` is available, otherwise an
 * accessible placeholder (still exposes `alt` as the accessible name) so
 * layout and tests don't depend on whether an image has been wired in yet.
 */
export function MonthPlanImage({ src, alt, sizes, className }: MonthPlanImageProps) {
  if (!src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          "absolute inset-0 flex items-center justify-center bg-muted",
          className
        )}
      >
        <ImageIcon aria-hidden className="size-6 text-text-muted/70" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className={cn("object-cover", className)}
    />
  );
}
