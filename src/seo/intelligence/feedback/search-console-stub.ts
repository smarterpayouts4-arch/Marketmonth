/**
 * Phase 2 stub — Google Search Console feedback.
 * Not wired; recommendations must not invent GSC metrics.
 */
export type SearchConsoleSnapshot = {
  status: "not_configured";
  message: string;
};

export async function fetchSearchConsoleSnapshot(): Promise<SearchConsoleSnapshot> {
  return {
    status: "not_configured",
    message:
      "Google Search Console integration is Planned (Phase 2). Configure property after production domain is live.",
  };
}
