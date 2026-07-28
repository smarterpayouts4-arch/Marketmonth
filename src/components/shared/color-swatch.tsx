import { cn } from "@/lib/utils";

type ColorSwatchProps = {
  hex: string;
  name?: string;
  className?: string;
  large?: boolean;
};

export function ColorSwatch({ hex, name, className, large }: ColorSwatchProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        className={cn(
          "rounded-xl border border-border shadow-soft",
          large ? "h-20 w-full" : "size-14"
        )}
        style={{ backgroundColor: hex }}
        aria-label={name ? `${name} ${hex}` : hex}
      />
      <div className="min-w-0">
        {name ? (
          <p className="truncate text-sm font-medium text-foreground">{name}</p>
        ) : null}
        <p className="font-mono text-xs text-text-muted uppercase">{hex}</p>
      </div>
    </div>
  );
}
