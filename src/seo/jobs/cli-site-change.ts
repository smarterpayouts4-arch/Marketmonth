import { siteChangeSeoReview } from "./site-change-review";

async function main() {
  const withResearch = process.argv.includes("--with-research");
  const brief = await siteChangeSeoReview(withResearch);
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
