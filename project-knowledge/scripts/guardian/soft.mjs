import fs from "node:fs";
import path from "node:path";

/**
 * @param {string} root
 * @param {{ warn: (code: string, message: string) => void }} emit
 */
export function checkUnownedPaths(root, { warn }) {
  const manifestPath = path.join(
    root,
    "project-knowledge",
    "generated",
    "indexes",
    "manifest.json"
  );
  if (!fs.existsSync(manifestPath)) return;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if ((manifest.ownership?.unownedCount ?? 0) > 50) {
    warn(
      "PK-WARN-003",
      `Many unowned src paths (${manifest.ownership.unownedCount}) — tighten ownership-rules.json`
    );
  }
}

/**
 * @param {string} root
 * @param {string[]} qualifyingFeatureRoots
 * @param {{ warn: (code: string, message: string) => void }} emit
 */
/** Map qualifying feature roots to FEATURES/*.md basenames when they differ. */
const FEATURE_DOC_BY_ROOT = {
  "src/engine/discovery": "discovery-engine",
  "src/components/discovery": "discovery-engine",
  "src/seo": "site-seo",
  "src/brain/content": "content-brain",
  "src/app/dev/brain/idea-lab": "idea-lab",
  "src/lib/auth": "auth",
};

export function checkFeatureDocs(root, qualifyingFeatureRoots, { warn }) {
  for (const featRoot of qualifyingFeatureRoots || []) {
    if (featRoot.includes("landing")) continue;
    const abs = path.join(root, featRoot);
    if (!fs.existsSync(abs)) continue;
    const docBase =
      FEATURE_DOC_BY_ROOT[featRoot.replace(/\\/g, "/")] ||
      path.basename(featRoot);
    const ok = fs.existsSync(
      path.join(root, "project-knowledge", "FEATURES", `${docBase}.md`)
    );
    if (!ok) {
      warn("PK-WARN-001", `Qualifying feature root missing FEATURES doc: ${featRoot}`);
    }
  }
}

/**
 * @param {Array<{ code?: string, rule?: string, path?: string, expires?: string, reason?: string }>} exceptions
 * @param {string} today
 * @param {{ warn: (code: string, message: string) => void }} emit
 */
export function checkExpiredExceptions(exceptions, today, { warn }) {
  for (const ex of exceptions || []) {
    if (ex.expires && ex.expires < today) {
      warn(
        "PK-WARN-002",
        `Expired ownership exception: ${ex.code || ex.rule} path=${ex.path} expired=${ex.expires} reason=${ex.reason || ""}`
      );
    }
  }
}
