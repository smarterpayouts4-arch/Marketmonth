import fs from "node:fs";
import path from "node:path";
import { normalizeText } from "./fs.mjs";
import { GENERATED_HEADER } from "./roots.mjs";

export function generatedPath(subdir, name) {
  return path.join("project-knowledge", "generated", subdir, name);
}

export function writeGeneratedFile(root, subdir, name, body) {
  const dir = path.join(root, "project-knowledge", "generated", subdir);
  fs.mkdirSync(dir, { recursive: true });
  const full = path.join(dir, name);
  let text = typeof body === "string" ? body : JSON.stringify(body, null, 2) + "\n";
  text = normalizeText(text);
  if (name.endsWith(".md")) {
    text = GENERATED_HEADER + text;
  }
  fs.writeFileSync(full, text, "utf8");
  return full;
}
