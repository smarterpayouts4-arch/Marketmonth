import { buildAppShellMetadata, buildLandingMetadata, buildRootMetadata } from "../foundation/metadata";
import { buildLandingJsonLdGraph } from "../foundation/structured-data";
import {
  PRODUCT_IDENTITY,
  getProductIdentity,
  namedShortDescription,
} from "../config/product-identity";

export function verifyRenderedMetadata(): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  try {
    const identity = getProductIdentity();
    const root = buildRootMetadata();
    const landing = buildLandingMetadata();
    const app = buildAppShellMetadata();
    const graph = buildLandingJsonLdGraph();

    if (root.metadataBase?.toString() !== `${identity.canonicalOrigin}/` &&
        String(root.metadataBase) !== identity.canonicalOrigin) {
      // Next URL may stringify with trailing slash
      const base = String(root.metadataBase).replace(/\/$/, "");
      if (base !== identity.canonicalOrigin) {
        errors.push(`metadataBase mismatch: ${root.metadataBase}`);
      }
    }

    const expectedDesc = namedShortDescription(identity);
    if (root.description !== expectedDesc) {
      errors.push(
        "root description must be namedShortDescription(PRODUCT_IDENTITY)"
      );
    }
    if (identity.shortDescription.includes(identity.displayName)) {
      errors.push(
        "shortDescription should stay name-independent (compose via namedShortDescription)"
      );
    }

    if (landing.openGraph?.title && !String(landing.openGraph.title).includes(PRODUCT_IDENTITY.displayName)) {
      errors.push("landing OG title must include displayName");
    }

    if (app.robots && typeof app.robots === "object" && !Array.isArray(app.robots)) {
      if (app.robots.index !== false) {
        errors.push("app shell metadata must set robots.index false");
      }
    } else {
      errors.push("app shell missing robots noindex");
    }

    const serialized = JSON.stringify(graph);
    if (!serialized.includes(PRODUCT_IDENTITY.displayName)) {
      errors.push("JSON-LD missing displayName");
    }
    if (!serialized.includes("Organization")) {
      errors.push("JSON-LD missing Organization");
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  return { ok: errors.length === 0, errors };
}

function main() {
  const result = verifyRenderedMetadata();
  if (!result.ok) {
    console.error("Rendered metadata verification failed:");
    for (const e of result.errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log("ok rendered metadata builders");
}

const isDirect =
  process.argv[1]?.includes("verify-rendered-metadata") ||
  process.argv[1]?.replace(/\\/g, "/").endsWith("verify-rendered-metadata.ts");
if (isDirect) main();
