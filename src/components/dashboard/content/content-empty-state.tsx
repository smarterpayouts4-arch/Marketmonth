import Link from "next/link";

type ContentEmptyStateProps = {
  title?: string;
  description?: string;
  errors?: string[];
};

export function ContentEmptyState({
  title = "Open Content Studio from an approved atom",
  description =
    "Content Studio loads with ?atomId=… after you approve and lock a Content Atom (Idea Lab → Create YouTube Content). This empty page means no atom was passed in the URL.",
  errors,
}: ContentEmptyStateProps) {
  return (
    <div
      className="mx-auto max-w-lg rounded-2xl border border-dashed border-border bg-card p-8 shadow-soft"
      data-testid="content-empty-state"
    >
      <p className="text-xs font-semibold tracking-[0.12em] text-text-muted uppercase">
        Content Studio
      </p>
      <h2 className="mt-2 font-heading text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="mt-3 text-sm text-text-secondary">{description}</p>
      {errors && errors.length > 0 ? (
        <ul
          className="mt-3 list-disc space-y-1 pl-5 text-xs text-danger"
          role="alert"
        >
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}
      <div className="mt-6">
        <Link
          href="/dev/brain/idea-lab"
          className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Open Idea Lab
        </Link>
      </div>
    </div>
  );
}
