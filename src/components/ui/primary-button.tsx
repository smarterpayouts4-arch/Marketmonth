import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PrimaryButtonProps = React.ComponentProps<typeof Button>;

export function PrimaryButton({ className, ...props }: PrimaryButtonProps) {
  return (
    <Button
      className={cn(
        "h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary-hover",
        className
      )}
      {...props}
    />
  );
}
