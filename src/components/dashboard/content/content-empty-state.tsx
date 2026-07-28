import Link from "next/link";

import { MARKETING_TOPIC_HREF } from "@/components/dashboard/dashboard-home/phase-query";

type ContentEmptyStateProps = {
  title?: string;
  description?: string;
  errors?: string[];
};

export function ContentEmptyState({
  title = "Select a content direction first",
  description = "Content Production Studio opens after you choose and save exactly one direction on Marketing Topic.",
  errors,
}: ContentEmptyStateProps) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-dashed border-border bg-card p-8 shadow-soft">
      <p className="text-xs font-semibold tracking-[0.12em] text-text-muted uppercase">
        Content
      </p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="mt-3 text-sm text-text-secondary">{description}</p>
      {errors && errors.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-red-700" role="alert">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}
      <div className="mt-6">
        <Link
          href={MARKETING_TOPIC_HREF}
          className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Back to Marketing Topic
        </Link>
      </div>
    </div>
  );
}
