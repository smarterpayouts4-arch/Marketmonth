import type {
  IdeaLabInspectResult,
  IdeaLabRun,
} from "@/brain/evaluation/idea-lab.types";

export function InputsTab({
  run,
  inspect,
}: {
  run: IdeaLabRun | null;
  inspect: IdeaLabInspectResult | null;
}) {
  return (
    <div className="space-y-4" data-testid="inspector-inputs">
      <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs leading-relaxed text-text-secondary">
        Brand Core was compiled for identity and lineage. Current deterministic
        idea generation primarily consumes ContentBrainContext.
      </p>
      <section>
        <h3 className="text-xs font-semibold tracking-wide text-text-muted uppercase">
          Brand fields found
        </h3>
        <p className="mt-1 text-xs text-text-secondary">
          {inspect?.brandFields.join(", ") || "—"}
        </p>
      </section>
      {run ? (
        <>
          <section>
            <h3 className="text-xs font-semibold tracking-wide text-text-muted uppercase">
              Context summary
            </h3>
            <ul className="mt-1 space-y-1 text-xs text-text-secondary">
              <li>Brand: {run.contextSummary.brandName}</li>
              <li>Products: {run.contextSummary.products.join(", ") || "—"}</li>
              <li>Services: {run.contextSummary.services.join(", ") || "—"}</li>
              <li>
                Opportunities:{" "}
                {run.contextSummary.contentOpportunities.join(", ") || "—"}
              </li>
            </ul>
          </section>
          <section>
            <h3 className="text-xs font-semibold tracking-wide text-text-muted uppercase">
              Brand Core summary
            </h3>
            <ul className="mt-1 space-y-1 text-xs text-text-secondary">
              <li>
                Primary idea input:{" "}
                {run.brandCoreSummary.usedAsPrimaryIdeaInput ? "yes" : "no"}
              </li>
              <li>
                Positioning: {run.brandCoreSummary.positioningSummary || "—"}
              </li>
              <li>Offers: {run.brandCoreSummary.offers.join(", ") || "—"}</li>
              <li>Proof count: {run.brandCoreSummary.proofCount}</li>
            </ul>
          </section>
          <section>
            <h3 className="text-xs font-semibold tracking-wide text-text-muted uppercase">
              Influence honesty
            </h3>
            <ul className="mt-2 space-y-2">
              {run.influence.map((item) => (
                <li
                  key={item.key}
                  className="rounded-lg border border-border px-2.5 py-2 text-xs"
                >
                  <span className="font-medium">{item.key}</span>{" "}
                  <span className="rounded bg-muted px-1">{item.origin}</span>
                  <div className="mt-0.5 text-text-secondary">
                    {Array.isArray(item.value)
                      ? item.value.join(", ") || "—"
                      : item.value == null
                        ? "—"
                        : String(item.value)}
                  </div>
                  {item.note ? (
                    <div className="mt-0.5 text-text-muted">{item.note}</div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <p className="text-xs text-text-muted">Generate a run to inspect inputs.</p>
      )}
    </div>
  );
}
