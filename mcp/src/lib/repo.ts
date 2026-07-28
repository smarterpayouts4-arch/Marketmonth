import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getRepoRoot(): string {
  // mcp/src/lib → repo root
  return path.resolve(__dirname, "../../..");
}

export function sha16(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);
}

export async function realpathSafe(p: string): Promise<string> {
  return fs.promises.realpath(p);
}
