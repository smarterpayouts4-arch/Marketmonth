import { runSeoReview } from "./run-seo-review";

/** Scheduled weekly research + audit. CLI: npx tsx src/seo/jobs/cli-weekly.ts */
export async function weeklySeoReview(auditsOnly = false) {
  return runSeoReview({ kind: "weekly", auditsOnly });
}
