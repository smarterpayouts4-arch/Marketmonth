import { assertPublicHttpUrl, CRAWL_DEFAULTS } from "../../security/url-policy.js";
import { failed, ok, partial, redactSecrets, type ToolEnvelope } from "../../contracts/envelope.js";
import { log } from "../../lib/log.js";

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let t: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<T>((_, rej) => {
        t = setTimeout(() => rej(new Error(`Timeout after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (t) clearTimeout(t);
  }
}

function boundJson(data: unknown, max = 120_000): unknown {
  const s = JSON.stringify(data);
  if (s.length <= max) return data;
  return {
    truncated: true,
    preview: s.slice(0, max),
    originalBytes: s.length,
  };
}

export async function runDiscoveryUrlTool(
  name: string,
  url: string,
  fn: (href: string) => Promise<unknown>
): Promise<ToolEnvelope<unknown>> {
  const policy = await assertPublicHttpUrl(url);
  if (!policy.ok) return failed(policy.reason);
  try {
    const data = await withTimeout(fn(policy.href), CRAWL_DEFAULTS.timeoutMs);
    return ok(boundJson(data), {
      sources: [{ url: policy.href, retrievedAt: new Date().toISOString() }],
      uncertainty: "medium",
      warnings: ["Network/LLM results may be incomplete; verify before product claims."],
    });
  } catch (e) {
    const msg = redactSecrets(e instanceof Error ? e.message : String(e));
    log(name, "error", msg);
    return failed(msg);
  }
}

export async function runDraftStrategy(
  input: unknown,
  fn: (input: unknown) => Promise<unknown>
): Promise<ToolEnvelope<unknown>> {
  try {
    const data = await withTimeout(fn(input), CRAWL_DEFAULTS.timeoutMs * 2);
    return partial(
      boundJson(data),
      ["Strategy draft requires human review before Content Universe production."],
      "medium"
    );
  } catch (e) {
    return failed(redactSecrets(e instanceof Error ? e.message : String(e)));
  }
}

export { ok, partial, failed };
