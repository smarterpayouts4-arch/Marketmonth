import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { withWriteLock } from "./write-lock";

function assertDevRuntime(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("brain/store JSON runtime is production-impossible");
  }
}

/** Windows often EPERM on rename-over-existing; replace then rename. */
function replaceAtomic(tmp: string, filePath: string): void {
  try {
    renameSync(tmp, filePath);
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: unknown }).code)
        : "";
    if (code !== "EPERM" && code !== "EEXIST") throw err;
    if (existsSync(filePath)) unlinkSync(filePath);
    renameSync(tmp, filePath);
  }
}

export async function writeJsonAtomic(
  filePath: string,
  data: unknown
): Promise<void> {
  assertDevRuntime();
  return withWriteLock(async () => {
    mkdirSync(path.dirname(filePath), { recursive: true });
    const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    const payload = `${JSON.stringify(data, null, 2)}\n`;
    writeFileSync(tmp, payload, "utf8");
    replaceAtomic(tmp, filePath);
  });
}

export function readJsonFile<T>(filePath: string): T | null {
  assertDevRuntime();
  try {
    const raw = readFileSync(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
