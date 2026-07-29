import { readFileSync } from "node:fs";
import path from "node:path";

import { APPROVED_CAPABILITIES } from "../config/approved-capabilities";
import { PRODUCT_IDENTITY } from "../config/product-identity";
import {
  CLAIM_LEDGER,
  PROHIBITED_PUBLIC_PHRASES,
  PUBLIC_POSITIONING,
  PUBLIC_PROCESS,
} from "../config/public-positioning";
import { buildLlmsTxt } from "../foundation/llms-document";
import { buildLandingMetadata, buildRootMetadata } from "../foundation/metadata";
import { buildLandingJsonLdGraph } from "../foundation/structured-data";

const LANDING_SOURCES = [
  "src/components/landing/hero-landing.tsx",
  "src/components/landing/landing-navbar.tsx",
  "src/components/landing/final-cta.tsx",
  "src/components/landing/process-strip.tsx",
  "src/components/landing/feature-section.tsx",
  "src/components/landing/content-universe/index.tsx",
  "src/components/landing/content-universe-visual.tsx",
  "src/components/landing/month-plan/intro-header.tsx",
  "src/components/landing/index.tsx",
  "src/components/landing/landing-copy.ts",
  "src/components/discovery/discovery-form.tsx",
] as const;

function readRepoFile(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function landingTitleAbsolute(): string {
  const landing = buildLandingMetadata();
  if (
    landing.title &&
    typeof landing.title === "object" &&
    "absolute" in landing.title &&
    typeof landing.title.absolute === "string"
  ) {
    return landing.title.absolute;
  }
  return "";
}

export function verifyClaimParity(): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  try {
    const root = buildRootMetadata();
    const graph = buildLandingJsonLdGraph();
    const llms = buildLlmsTxt();
    const serializedGraph = JSON.stringify(graph);
    const landingBundle = LANDING_SOURCES.map(readRepoFile).join("\n");
    const landingCopySource = readRepoFile("src/components/landing/landing-copy.ts");

    if (
      root.description !==
      `${PRODUCT_IDENTITY.displayName} - ${PRODUCT_IDENTITY.shortDescription}`
    ) {
      errors.push(
        "root metadata description must match named product identity description"
      );
    }

    if (!landingTitleAbsolute().includes(PRODUCT_IDENTITY.tagline)) {
      errors.push("landing metadata title must include PRODUCT_IDENTITY.tagline");
    }

    if (!serializedGraph.includes(PRODUCT_IDENTITY.shortDescription)) {
      errors.push("JSON-LD must include PRODUCT_IDENTITY.shortDescription");
    }

    if (!serializedGraph.includes(PUBLIC_POSITIONING.offerDescription)) {
      errors.push(
        "JSON-LD Offer description must match PUBLIC_POSITIONING.offerDescription"
      );
    }

    for (const feature of APPROVED_CAPABILITIES.live) {
      if (!serializedGraph.includes(feature)) {
        errors.push(
          `JSON-LD featureList missing approved live capability: ${feature}`
        );
      }
    }

    if (!llms.includes(PUBLIC_PROCESS.label)) {
      errors.push("llms.txt must include canonical PUBLIC_PROCESS.label");
    }

    if (!llms.includes(PUBLIC_POSITIONING.positioningStatement)) {
      errors.push(
        "llms.txt must include PUBLIC_POSITIONING.positioningStatement"
      );
    }

    if (!llms.includes(PUBLIC_POSITIONING.freeAnalysisLine)) {
      errors.push("llms.txt must include free-analysis terms");
    }

    if (!landingCopySource.includes("@/seo/config/public-positioning")) {
      errors.push("landing-copy.ts must import from public-positioning");
    }

    const requiredImports: Array<{ file: string; needle: string }> = [
      { file: "src/components/landing/hero-landing.tsx", needle: "heroHeadline" },
      { file: "src/components/landing/final-cta.tsx", needle: "freeAnalysisLine" },
      {
        file: "src/components/landing/landing-navbar.tsx",
        needle: "primaryCta",
      },
      {
        file: "src/components/landing/process-strip.tsx",
        needle: "processSteps",
      },
      {
        file: "src/components/landing/content-universe/index.tsx",
        needle: "contentUniverseBadge",
      },
      {
        file: "src/components/discovery/discovery-form.tsx",
        needle: "PUBLIC_POSITIONING",
      },
    ];

    for (const check of requiredImports) {
      const source = readRepoFile(check.file);
      if (!source.includes(check.needle)) {
        errors.push(`${check.file} must consume approved claim field: ${check.needle}`);
      }
    }

    if (CLAIM_LEDGER.length === 0) {
      errors.push("CLAIM_LEDGER must not be empty");
    }

    const visitorFacingValues = [
      PUBLIC_POSITIONING.heroHeadline,
      PUBLIC_POSITIONING.heroSubhead,
      PUBLIC_POSITIONING.primaryCta,
      PUBLIC_POSITIONING.freeAnalysisLine,
      PUBLIC_POSITIONING.freeAnalysisNote,
      PUBLIC_POSITIONING.contentUniverseBadge,
      PUBLIC_POSITIONING.monthPlanBody,
      PRODUCT_IDENTITY.tagline,
      PRODUCT_IDENTITY.shortDescription,
      ...APPROVED_CAPABILITIES.live,
      ...APPROVED_CAPABILITIES.prototype,
    ]
      .join("\n")
      .toLowerCase();

    for (const phrase of PROHIBITED_PUBLIC_PHRASES) {
      if (visitorFacingValues.includes(phrase.toLowerCase())) {
        errors.push(
          `approved visitor-facing claim source contains prohibited phrase: "${phrase}"`
        );
      }
    }

    if (/free trial/i.test(landingBundle)) {
      errors.push('landing sources must not use the phrase "free trial"');
    }

    if (/ready to publish/i.test(landingBundle)) {
      errors.push('landing sources must not claim "ready to publish"');
    }

    if (
      /live content flow|live distribution|updates in real time|LIVE: Distributing now/i.test(
        landingBundle
      )
    ) {
      errors.push(
        "landing sources must not claim live distribution or real-time updates"
      );
    }

    if (serializedGraph.toLowerCase().includes("aggregaterating")) {
      errors.push("JSON-LD must not include aggregateRating");
    }

    if (/"@type"\s*:\s*"Review"/i.test(serializedGraph)) {
      errors.push("JSON-LD must not include Review entities");
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  return { ok: errors.length === 0, errors };
}

function main() {
  const result = verifyClaimParity();
  if (!result.ok) {
    console.error("Claim parity verification failed:");
    for (const e of result.errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log("ok claim parity");
}

const isDirect =
  process.argv[1]?.includes("verify-claim-parity") ||
  process.argv[1]?.replace(/\\/g, "/").endsWith("verify-claim-parity.ts");
if (isDirect) main();
