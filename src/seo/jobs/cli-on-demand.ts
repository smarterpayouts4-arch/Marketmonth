import { onDemandSeoReview } from "./on-demand-review";

async function main() {
  const auditsOnly = process.argv.includes("--audits-only");
  const brief = await onDemandSeoReview(auditsOnly);
  console.log(
    JSON.stringify(
      {
        id: brief.id,
        generatedAt: brief.generatedAt,
        newCount: brief.newCount,
        highPriorityCount: brief.highPriorityCount,
        recommendationCount: brief.recommendations.length,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
