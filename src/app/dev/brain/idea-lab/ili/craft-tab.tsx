import type { AtomValidationReport } from "@/brain/atom";

import { Row } from "./row";

export function CraftTab({
  validation,
}: {
  validation?: AtomValidationReport | null;
}) {
  if (!validation?.craftReport) {
    return (
      <p className="text-sm text-text-muted" data-testid="inspector-craft-empty">
        Build a Content Atom to inspect hook and storytelling craft scores.
      </p>
    );
  }

  const craft = validation.craftReport;
  return (
    <div className="space-y-4" data-testid="inspector-craft">
      <dl className="space-y-2">
        <Row label="Craft DNA version" value={craft.craftDnaVersion} mono />
        <Row label="Hook quality" value={`${craft.hookQuality} / 5`} />
        <Row label="Story craft" value={`${craft.storyCraft} / 5`} />
      </dl>
      <div>
        <p className="text-[11px] font-medium tracking-wide text-text-muted uppercase">
          Craft moves
        </p>
        <ul className="mt-2 space-y-2">
          {craft.moves.map((m) => (
            <li
              key={m.id}
              className="rounded-lg border border-border bg-subtle/40 px-3 py-2"
            >
              <p className="text-xs font-semibold text-foreground">{m.label}</p>
              <p className="text-[11px] text-text-muted">{m.field}</p>
              <p className="mt-1 text-sm text-text-secondary">{m.excerpt}</p>
            </li>
          ))}
        </ul>
      </div>
      {validation.researchHandoff ? (
        <div>
          <p className="text-[11px] font-medium tracking-wide text-text-muted uppercase">
            Research handoff
          </p>
          <ul className="mt-2 space-y-1 text-sm text-text-secondary">
            {validation.researchHandoff.unresolvedQuestions
              .slice(0, 8)
              .map((q) => (
                <li key={q}>• {q}</li>
              ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
