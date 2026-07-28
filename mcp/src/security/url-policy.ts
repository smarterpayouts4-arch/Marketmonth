import { lookup } from "node:dns/promises";
import net from "node:net";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.goog",
]);

function isPrivateIp(ip: string): boolean {
  if (ip === "127.0.0.1" || ip === "::1") return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (ip.startsWith("169.254.")) return true;
  const m = ip.match(/^172\.(\d+)\./);
  if (m) {
    const n = Number(m[1]);
    if (n >= 16 && n <= 31) return true;
  }
  if (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80")) return true;
  return false;
}

export type UrlPolicyResult =
  | { ok: true; href: string }
  | { ok: false; reason: string };

export async function assertPublicHttpUrl(
  raw: string,
  opts?: { allowPrivate?: boolean }
): Promise<UrlPolicyResult> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { ok: false, reason: "Invalid URL" };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return { ok: false, reason: `Protocol not allowed: ${u.protocol}` };
  }
  if (u.username || u.password) {
    return { ok: false, reason: "URL credentials not allowed" };
  }
  const host = u.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host) || host.endsWith(".localhost")) {
    if (!opts?.allowPrivate && process.env.MARKETMONTH_MCP_ALLOW_PRIVATE_NETWORK !== "1") {
      return { ok: false, reason: `Blocked host: ${host}` };
    }
  }
  if (net.isIP(host)) {
    if (isPrivateIp(host) && process.env.MARKETMONTH_MCP_ALLOW_PRIVATE_NETWORK !== "1") {
      return { ok: false, reason: `Blocked private IP: ${host}` };
    }
  } else {
    try {
      const records = await lookup(host, { all: true });
      for (const r of records) {
        if (
          isPrivateIp(r.address) &&
          process.env.MARKETMONTH_MCP_ALLOW_PRIVATE_NETWORK !== "1"
        ) {
          return { ok: false, reason: `Host resolves to private IP: ${r.address}` };
        }
      }
    } catch {
      return { ok: false, reason: `DNS lookup failed for ${host}` };
    }
  }
  return { ok: true, href: u.href };
}

export const CRAWL_DEFAULTS = {
  maxPages: 12,
  maxRedirects: 5,
  timeoutMs: 20_000,
  maxBytes: 1_500_000,
};
