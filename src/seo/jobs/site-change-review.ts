import { runSeoReview } from "./run-seo-review";

/**
 * Lightweight review after major public-route / foundation deploys.
 * Defaults to audits-only unless withResearch is true.
 */
export async function siteChangeSeoReview(withResearch = false) {
  return runSeoReview({
    kind: "site-change",
    auditsOnly: !withResearch,
  });
}
