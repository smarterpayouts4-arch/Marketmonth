import { cn } from "@/lib/utils";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  large?: boolean;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  large = false,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="max-w-3xl space-y-2">
        {eyebrow ? (
          <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className={large ? "text-page-hero" : "text-page-title"}>{title}</h1>
        {description ? (
          <p className="max-w-2xl text-base text-text-secondary">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
