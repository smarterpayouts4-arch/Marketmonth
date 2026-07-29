import { Sparkles } from "lucide-react";

type Props = {
  text: string;
};

/** Compact strategic takeaway — not presented as website evidence. */
export function DiscoveryTakeaway({ text }: Props) {
  const t = text.trim();
  if (!t) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl border border-primary/15 bg-primary/[0.06] px-3 py-2">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Sparkles className="size-3" aria-hidden />
      </span>
      <p className="line-clamp-2 text-[12.5px] leading-snug text-foreground sm:text-[13px]">
        {t}
      </p>
    </div>
  );
}
