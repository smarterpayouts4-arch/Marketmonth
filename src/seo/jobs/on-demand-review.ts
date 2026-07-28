import { runSeoReview } from "./run-seo-review";

/** Manual refresh. CLI: npx tsx src/seo/jobs/cli-on-demand.ts */
export async function onDemandSeoReview(auditsOnly = false) {
  return runSeoReview({ kind: "on-demand", auditsOnly });
}
