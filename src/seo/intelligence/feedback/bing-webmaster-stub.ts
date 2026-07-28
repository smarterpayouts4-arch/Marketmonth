/**
 * Phase 2 stub — Bing Webmaster Tools feedback.
 */
export type BingWebmasterSnapshot = {
  status: "not_configured";
  message: string;
};

export async function fetchBingWebmasterSnapshot(): Promise<BingWebmasterSnapshot> {
  return {
    status: "not_configured",
    message:
      "Bing Webmaster Tools integration is Planned (Phase 2). Configure after production domain is live.",
  };
}
