import {
  buildLandingJsonLdGraph,
  jsonLdScriptContent,
} from "@/seo/foundation/structured-data";

/** Server component: injects landing JSON-LD from the SEO foundation. */
export function LandingJsonLd() {
  const graph = buildLandingJsonLdGraph();
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdScriptContent(graph) }}
    />
  );
}
