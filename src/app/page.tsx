import type { Metadata } from "next";

import { LandingPage } from "@/components/landing";
import { LandingJsonLd } from "@/components/seo/json-ld";
import { buildLandingMetadata } from "@/seo/foundation/metadata";

export const metadata: Metadata = buildLandingMetadata();

export default function Page() {
  return (
    <>
      <LandingJsonLd />
      <LandingPage />
    </>
  );
}
