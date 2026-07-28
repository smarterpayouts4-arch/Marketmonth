/**
 * Phase 2 stub — analytics + AI-search referral visibility.
 */
export type AnalyticsSeoSnapshot = {
  status: "not_configured";
  message: string;
};

export async function fetchAnalyticsSeoSnapshot(): Promise<AnalyticsSeoSnapshot> {
  return {
    status: "not_configured",
    message:
      "Analytics SEO feedback is Planned (Phase 2). Will feed recommendations without collapsing foundation/intelligence layers.",
  };
}
