"use client";

type ResearchNoticeProps = {
  unresolvedResearch: string[];
};

export function ResearchNotice({ unresolvedResearch }: ResearchNoticeProps) {
  return (
    <div
      className="studio-prompt-card studio-prompt-card--notice"
      role="status"
      data-testid="studio-research-required"
    >
      <p className="font-semibold">Research required</p>
      <p className="mt-0.5 text-text-secondary">
        Draft only — export stays unavailable.
      </p>
      {unresolvedResearch.length > 0 ? (
        <ul className="mt-1 list-disc space-y-0.5 pl-3.5">
          {unresolvedResearch.slice(0, 4).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
