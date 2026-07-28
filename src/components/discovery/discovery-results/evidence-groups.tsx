import type { DiscoveryEvidence } from "@/components/discovery/activation";

const KIND_LABEL: Record<DiscoveryEvidence["kind"], string> = {
  observed: "Observed on your website",
  interpreted: "What this suggests",
  recommended: "What to try first",
};

const KIND_ORDER: DiscoveryEvidence["kind"][] = [
  "observed",
  "interpreted",
  "recommended",
];

function sourceHost(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Grouped evidence blocks — omit empty kinds; show source when present. */
export function EvidenceGroups({ evidence }: { evidence: DiscoveryEvidence[] }) {
  return (
    <div className="space-y-2">
      {KIND_ORDER.map((kind) => {
        const items = evidence.filter((e) => e.kind === kind && e.text.trim());
        if (!items.length) return null;
        return (
          <div key={kind}>
            <p className="text-[11px] font-semibold tracking-[0.06em] text-text-muted uppercase">
              {KIND_LABEL[kind]}
            </p>
            <ul className="mt-1 space-y-1">
              {items.map((item) => {
                const host = sourceHost(item.sourceUrl);
                return (
                  <li
                    key={`${kind}-${item.text.slice(0, 40)}`}
                    className="text-sm leading-snug text-foreground"
                  >
                    {item.text}
                    {host ? (
                      <span className="mt-0.5 block text-[11px] text-text-muted">
                        From {host}
                        {item.sourceUrl ? (
                          <>
                            {" · "}
                            <a
                              href={item.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="underline-offset-2 hover:underline"
                            >
                              page
                            </a>
                          </>
                        ) : null}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
