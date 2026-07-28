export function Field({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="space-y-0.5">
      <dt className="text-[10px] font-semibold tracking-wide text-text-muted uppercase">
        {label}
      </dt>
      <dd className="text-xs leading-snug whitespace-pre-wrap text-foreground">
        {value}
      </dd>
    </div>
  );
}
