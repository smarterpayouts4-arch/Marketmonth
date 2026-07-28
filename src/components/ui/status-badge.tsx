import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-muted text-text-secondary",
  primary: "bg-subtle text-primary-dark",
  accent: "bg-warm/15 text-foreground",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-foreground",
  danger: "bg-danger/10 text-danger",
} as const;

type StatusBadgeProps = {
  children: React.ReactNode;
  tone?: keyof typeof tones;
  className?: string;
};

export function StatusBadge({
  children,
  tone = "neutral",
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
