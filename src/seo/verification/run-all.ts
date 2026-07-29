import { verifyBrandConsistency } from "./verify-brand-consistency";
import { verifyClaimParity } from "./verify-claim-parity";
import { verifyCrawlFiles } from "./verify-crawl-files";
import { verifyRenderedMetadata } from "./verify-rendered-metadata";

function main() {
  const brand = verifyBrandConsistency();
  const crawl = verifyCrawlFiles();
  const meta = verifyRenderedMetadata();
  const claims = verifyClaimParity();

  let failed = false;
  if (!brand.ok) {
    failed = true;
    console.error("Brand consistency failed:");
    for (const v of brand.violations) {
      console.error(`  ${v.file}: ${v.matches.join(", ")}`);
    }
  } else {
    console.log("ok brand consistency");
  }

  if (!crawl.ok) {
    failed = true;
    console.error("Crawl files failed:");
    for (const e of crawl.errors) console.error(`  - ${e}`);
  } else {
    console.log("ok crawl files");
  }

  if (!meta.ok) {
    failed = true;
    console.error("Rendered metadata failed:");
    for (const e of meta.errors) console.error(`  - ${e}`);
  } else {
    console.log("ok rendered metadata");
  }

  if (!claims.ok) {
    failed = true;
    console.error("Claim parity failed:");
    for (const e of claims.errors) console.error(`  - ${e}`);
  } else {
    console.log("ok claim parity");
  }

  if (failed) process.exit(1);
  console.log("seo:verify passed");
}

main();
