import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BrandSectionCardProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
  className?: string;
  prominent?: boolean;
};

export function BrandSectionCard({
  title,
  actionLabel = "Edit",
  onAction,
  children,
  className,
  prominent,
}: BrandSectionCardProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-soft",
        prominent && "border-primary/20 bg-subtle/40",
        className
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">{title}</h3>
        {onAction ? (
          <Button
            type="button"
            variant="ghost"
            className="h-8 rounded-lg text-primary"
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        ) : null}
      </div>
      {children}
    </section>
  );
}
