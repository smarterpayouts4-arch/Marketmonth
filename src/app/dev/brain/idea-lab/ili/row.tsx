export function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[11px] font-medium tracking-wide text-text-muted uppercase">
        {label}
      </dt>
      <dd
        className={
          mono
            ? "mt-0.5 break-all font-mono text-[11px] text-text-secondary"
            : "mt-0.5 text-sm text-foreground"
        }
      >
        {value}
      </dd>
    </div>
  );
}
