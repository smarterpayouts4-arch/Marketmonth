import { mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { MediaPreflightInput } from "./types";

export type ResolveLocalSourceResult =
  | { ok: true; localPath: string; tempDir: string | null }
  | { ok: false; code: string; error: string };

export async function resolveLocalSource(
  source: MediaPreflightInput["source"],
  checkUrlReachable?: boolean
): Promise<ResolveLocalSourceResult> {
  let localPath: string | null = null;
  let tempDir: string | null = null;

  if (typeof source === "string") {
    if (checkUrlReachable !== false && /^https?:\/\//i.test(source)) {
      const head = await fetch(source, { method: "HEAD" });
      if (!head.ok) {
        const get = await fetch(source, {
          headers: { Range: "bytes=0-1023" },
        });
        if (!get.ok && get.status !== 206) {
          return {
            ok: false,
            code: "media_preflight.url_unreachable",
            error: `Media URL not reachable (${get.status})`,
          };
        }
      }
    }
    if (/^https?:\/\//i.test(source)) {
      const res = await fetch(source);
      if (!res.ok) {
        return {
          ok: false,
          code: "media_preflight.download_failed",
          error: `Failed to download media (${res.status})`,
        };
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length === 0) {
        return {
          ok: false,
          code: "media_preflight.empty_file",
          error: "Media file is empty",
        };
      }
      tempDir = mkdtempSync(path.join(tmpdir(), "mm-preflight-"));
      localPath = path.join(tempDir, "probe.mp4");
      writeFileSync(localPath, buf);
    } else {
      localPath = source;
    }
  } else {
    if (!source.bytes.length) {
      return {
        ok: false,
        code: "media_preflight.empty_file",
        error: "Media file is empty",
      };
    }
    tempDir = mkdtempSync(path.join(tmpdir(), "mm-preflight-"));
    localPath = path.join(tempDir, source.hintName ?? "probe.mp4");
    writeFileSync(localPath, source.bytes);
  }

  const size = statSync(localPath).size;
  if (!(size > 0)) {
    return {
      ok: false,
      code: "media_preflight.empty_file",
      error: "Media file is empty",
    };
  }

  return { ok: true, localPath, tempDir };
}

export function cleanupTempDir(tempDir: string | null): void {
  if (tempDir) {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      /* best-effort */
    }
  }
}
