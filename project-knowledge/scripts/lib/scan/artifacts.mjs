import fs from "node:fs";
import path from "node:path";
import { resolveNextRoute } from "../resolve-next-route.mjs";
import { collectProcessEnvRefs, parseEnvExample } from "./env.mjs";
import { contentHash, relPosix, walkFiles } from "./fs.mjs";
import { parseFrontmatter } from "./frontmatter.mjs";
import { loadOwnershipRules, matchOwner } from "./ownership.mjs";
import { expectedStageForRoute } from "./routes.mjs";

/** Stable docs-index id from repo-relative path (e.g. current-state). */
export function docIdFromPath(relPosixPath) {
  const base = path.basename(relPosixPath, path.extname(relPosixPath));
  return base
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function docDescription(body, title) {
  const prose = String(body || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith("#") && !l.startsWith("---") && !l.startsWith("|"));
  if (!prose) return title;
  return prose.replace(/^[*_`>]+|[*_`]+$/g, "").slice(0, 160);
}

/** Collect route/api/env/ownership/docs scan inputs into one bundle. */
export function buildArtifactBundle(root) {
  const appRoot = path.join(root, "src", "app");

  const pages = walkFiles(
    appRoot,
    (f, name) => name === "page.tsx" || name === "page.ts"
  );
  const routes = [];
  const byRoute = new Map();
  for (const abs of pages) {
    const rel = relPosix(root, abs);
    if (
      rel.startsWith("Refrence folder/") ||
      rel.startsWith("reference-library/")
    ) {
      continue;
    }
    const route = resolveNextRoute(rel, { kind: "page" });
    if (!route) continue;
    const meta = expectedStageForRoute(route, root);
    const entry = {
      route,
      sourceFile: rel,
      expectedSurface: meta.surface,
      expectedStage: meta.stage,
    };
    routes.push(entry);
    const list = byRoute.get(route) || [];
    list.push(rel);
    byRoute.set(route, list);
  }
  const duplicateRoutes = [...byRoute.entries()]
    .filter(([, files]) => files.length > 1)
    .map(([route, files]) => ({ route, files }));

  const handlers = walkFiles(
    path.join(appRoot, "api"),
    (f, name) => name === "route.ts" || name === "route.js"
  );
  const apis = handlers.map((abs) => {
    const rel = relPosix(root, abs);
    const route = resolveNextRoute(rel, { kind: "route" });
    return {
      path: route || "/api/?",
      sourceFile: rel,
    };
  });

  const examplePath = path.join(root, ".env.example");
  const documented = fs.existsSync(examplePath)
    ? parseEnvExample(fs.readFileSync(examplePath, "utf8"))
    : [];
  const referenced = collectProcessEnvRefs(root);
  const docSet = new Set(documented);
  const refSet = new Set(referenced);
  const envRows = [];
  const all = [...new Set([...documented, ...referenced])].sort();
  for (const key of all) {
    const inDoc = docSet.has(key);
    const inRef = refSet.has(key);
    let classification = "unknown";
    if (key.startsWith("NEXT_PUBLIC_")) classification = "client-exposed";
    else if (inDoc && inRef) classification = "server-only";
    else if (inDoc && !inRef) classification = "documented-unused";
    else if (!inDoc && inRef) classification = "undocumented";
    envRows.push({
      variable: key,
      inEnvExample: inDoc,
      referencedInSrc: inRef,
      classification,
    });
  }

  const rules = loadOwnershipRules(root);
  const srcFiles = walkFiles(path.join(root, "src"), () => true).map((a) =>
    relPosix(root, a)
  );
  const mapped = [];
  const unowned = [];
  for (const rel of srcFiles) {
    const owner = matchOwner(rel, rules.owners);
    if (owner) mapped.push({ path: rel, owner });
    else unowned.push(rel);
  }

  const pk = path.join(root, "project-knowledge");
  const docs = walkFiles(
    pk,
    (f, name) =>
      name.endsWith(".md") && !f.includes(`${path.sep}generated${path.sep}`)
  );
  const documents = [];
  for (const abs of docs) {
    const rel = relPosix(root, abs);
    const text = fs.readFileSync(abs, "utf8");
    const { data, body } = parseFrontmatter(text);
    const title = data.title || path.basename(rel, ".md");
    const authority = data.authority || "supporting";
    const id = docIdFromPath(rel);
    documents.push({
      id,
      path: rel,
      title,
      description: docDescription(body, title),
      kind: authority === "canonical" ? "canonical" : "supporting",
      authority,
      status: data.status || "active",
      owner: data.owner || null,
      audience: ["human", "coding-agent", "mcp"],
      generated: false,
    });
  }
  documents.sort((a, b) => a.path.localeCompare(b.path));

  const docsIndex = {
    schemaVersion: 1,
    documents,
    ignoredPaths: [
      "Refrence folder/",
      "reference-library/",
      "project-knowledge/generated/",
      "node_modules/",
    ],
  };

  const manifest = {
    schemaVersion: 1,
    routes,
    apis,
    envKeys: envRows,
    duplicateRoutes,
    ownership: {
      unownedCount: unowned.length,
      qualifyingFeatureRoots: rules.qualifyingFeatureRoots || [],
    },
    contentFingerprints: {
      routes: contentHash(JSON.stringify(routes)),
      apis: contentHash(JSON.stringify(apis)),
      env: contentHash(JSON.stringify(envRows)),
    },
  };

  return {
    routes,
    duplicateRoutes,
    apis,
    envRows,
    ownership: {
      mapped,
      unowned,
      qualifyingFeatureRoots: rules.qualifyingFeatureRoots || [],
    },
    docsIndex,
    manifest,
  };
}
