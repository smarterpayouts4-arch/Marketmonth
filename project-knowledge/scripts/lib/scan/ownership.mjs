import fs from "node:fs";
import path from "node:path";

export function loadOwnershipRules(root) {
  const p = path.join(root, "project-knowledge", "ownership-rules.json");
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function globMatch(rel, pattern) {
  const nRel = rel.replace(/\\/g, "/");
  const nPat = pattern.replace(/\\/g, "/");
  if (nPat.endsWith("/**")) {
    const prefix = nPat.slice(0, -3);
    return nRel === prefix || nRel.startsWith(prefix + "/");
  }
  return nRel === nPat;
}

export function matchOwner(rel, owners) {
  for (const [owner, patterns] of Object.entries(owners)) {
    for (const pat of patterns) {
      if (globMatch(rel, pat)) return owner;
    }
  }
  return null;
}
