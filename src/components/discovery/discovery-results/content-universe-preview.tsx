import type { ContentUniverse } from "@/lib/discovery/discovery-narrative.schema";

export function ContentUniversePreview({
  universe,
}: {
  universe: ContentUniverse;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold tracking-[0.06em] text-text-muted uppercase">
        Example multi-day sequence
      </p>
      <p className="text-sm font-medium text-foreground">{universe.coreTopic}</p>
      <p className="text-xs text-text-secondary">{universe.strategicPurpose}</p>
      <ol className="mt-1 space-y-1.5">
        {universe.pieces.slice(0, 6).map((piece) => (
          <li
            key={`${piece.dayOffset}-${piece.platform}-${piece.format}`}
            className="rounded-lg border border-border/60 bg-subtle/40 px-3 py-2 text-xs leading-snug"
          >
            <span className="font-semibold text-foreground">
              Day {piece.dayOffset}
            </span>
            <span className="text-text-muted">
              {" "}
              · {piece.platform} · {piece.format}
            </span>
            <span className="mt-0.5 block text-text-secondary">{piece.hook}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
