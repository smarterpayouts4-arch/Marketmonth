import fs from "node:fs";
import path from "node:path";
import { parseFrontmatter } from "../lib/scan.mjs";

/**
 * @param {string} root
 * @param {{ fail: (code: string, message: string) => void }} emit
 */
export function checkProductAuthority(root, { fail }) {
  const productPath = path.join(root, "project-knowledge", "PRODUCT.md");
  if (!fs.existsSync(productPath)) {
    fail("PK-HARD-001", "Required product authority missing: project-knowledge/PRODUCT.md");
  } else {
    const body = parseFrontmatter(fs.readFileSync(productPath, "utf8")).body;
    if (!/MARKETMONTH NORTH STAR/.test(body) || !/strategy-first/i.test(body)) {
      fail("PK-HARD-002", "PRODUCT.md missing required north star / strategy-first sections");
    }
  }
}

/**
 * @param {string} root
 * @param {{ fail: (code: string, message: string) => void }} emit
 */
export function checkApsProductStub(root, { fail }) {
  const apsProduct = path.join(root, "agent-prompt-system", "project-context", "PRODUCT.md");
  if (!fs.existsSync(apsProduct)) return;
  const t = fs.readFileSync(apsProduct, "utf8");
  if (/MARKETMONTH NORTH STAR/.test(t) && /PRODUCT LOOP/.test(t)) {
    fail(
      "PK-HARD-003",
      "APS project-context/PRODUCT.md still contains full doctrine — must be pointer stub only"
    );
  }
  if (!/project-knowledge\/PRODUCT\.md/.test(t)) {
    fail("PK-HARD-004", "APS PRODUCT stub does not point at project-knowledge/PRODUCT.md");
  }
}

/**
 * @param {string} root
 * @param {{ fail: (code: string, message: string) => void }} emit
 */
export function checkManifestDuplicates(root, { fail }) {
  const manifestPath = path.join(
    root,
    "project-knowledge",
    "generated",
    "indexes",
    "manifest.json"
  );
  if (!fs.existsSync(manifestPath)) return;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (manifest.duplicateRoutes?.length) {
    for (const d of manifest.duplicateRoutes) {
      fail("PK-HARD-005", `Duplicate resolved route: ${d.route} → ${d.files.join(", ")}`);
    }
  }
}
