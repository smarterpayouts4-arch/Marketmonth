import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NextActionProps = {
  label: string;
  description: string;
  ctaLabel: string;
  href?: string;
  onClick?: () => void;
};

export function NextAction({
  label,
  description,
  ctaLabel,
  href,
  onClick,
}: NextActionProps) {
  const ctaClass = cn(
    buttonVariants(),
    "h-11 rounded-xl bg-warm px-5 text-sm font-semibold text-white hover:bg-warm/90"
  );

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-[0.12em] text-warm uppercase">
          {label}
        </p>
        <p className="mt-1 text-base font-medium text-foreground">{description}</p>
      </div>
      {href ? (
        <Link href={href} className={cn(ctaClass, "shrink-0")}>
          {ctaLabel}
        </Link>
      ) : (
        <button type="button" onClick={onClick} className={cn(ctaClass, "shrink-0")}>
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
