/**
 * Perplexity connectivity + config diagnostic.
 * Never prints the API key — only presence, length, and HTTP results.
 *
 * Usage: npm run perplexity:doctor
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadDotEnv(): void {
  for (const name of [".env.local", ".env"]) {
    const p = resolve(process.cwd(), name);
    if (!existsSync(p)) continue;
    const text = readFileSync(p, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (!m) continue;
      const [, key, raw] = m;
      if (process.env[key] === undefined) {
        process.env[key] = raw.replace(/^["']|["']$/g, "");
      }
    }
  }
}

function loadMcpKey(): string | null {
  if (process.env.PERPLEXITY_API_KEY?.trim()) return null;
  const mcpPath = resolve(
    process.env.USERPROFILE || process.env.HOME || "",
    ".cursor",
    "mcp.json"
  );
  if (!existsSync(mcpPath)) return null;
  try {
    const raw = JSON.parse(readFileSync(mcpPath, "utf8")) as {
      mcpServers?: Record<string, { env?: Record<string, string> }>;
    };
    for (const cfg of Object.values(raw.mcpServers ?? {})) {
      const candidate = cfg.env?.PERPLEXITY_API_KEY?.trim();
      if (candidate) {
        process.env.PERPLEXITY_API_KEY = candidate;
        return mcpPath;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

loadDotEnv();
const mcpFallbackPath = loadMcpKey();

type Check = { name: string; ok: boolean; detail: string };
const checks: Check[] = [];

function add(name: string, ok: boolean, detail: string) {
  checks.push({ name, ok, detail });
}

const hasEnvFile =
  existsSync(resolve(process.cwd(), ".env")) ||
  existsSync(resolve(process.cwd(), ".env.local"));

const key = process.env.PERPLEXITY_API_KEY?.trim() ?? "";
add(
  "MarketMonth .env / .env.local",
  hasEnvFile,
  hasEnvFile
    ? "present"
    : "missing — copy .env.example → .env and set PERPLEXITY_API_KEY"
);

add(
  "PERPLEXITY_API_KEY loaded",
  Boolean(key),
  key
    ? mcpFallbackPath
      ? `set via Cursor MCP fallback (${mcpFallbackPath}) — still add .env for Next.js`
      : `set (len=${key.length})`
    : "NOT SET"
);

add(
  "INDUSTRY_RESEARCH_ENABLED",
  process.env.INDUSTRY_RESEARCH_ENABLED?.trim().toLowerCase() !== "false",
  process.env.INDUSTRY_RESEARCH_ENABLED ?? "(unset → enabled by default)"
);

add(
  "INDUSTRY_RESEARCH_LIVE",
  process.env.INDUSTRY_RESEARCH_LIVE?.trim().toLowerCase() === "true",
  process.env.INDUSTRY_RESEARCH_LIVE ?? "(unset → live Perplexity OFF in Idea Lab)"
);

add(
  "PERPLEXITY_SEO_MODEL",
  true,
  process.env.PERPLEXITY_SEO_MODEL?.trim() || "(unset → default sonar)"
);

function parseApiError(text: string): string {
  try {
    const parsed = JSON.parse(text) as {
      error?: { message?: unknown; type?: unknown; code?: unknown };
    };
    const e = parsed.error;
    if (e && typeof e === "object") {
      return [
        e.message != null ? String(e.message) : "",
        e.type != null ? `type=${String(e.type)}` : "",
        e.code != null ? `code=${String(e.code)}` : "",
      ]
        .filter(Boolean)
        .join(" | ");
    }
  } catch {
    /* fall through */
  }
  return text.slice(0, 240);
}

async function probeEndpoint(
  label: string,
  url: string,
  body: unknown
): Promise<void> {
  if (!key) {
    add(label, false, "skipped — no key");
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify(body),
    });
    const text = await res.text();
    add(
      label,
      res.ok,
      res.ok ? `HTTP ${res.status} — success` : `HTTP ${res.status} — ${parseApiError(text)}`
    );
  } catch (err) {
    add(label, false, err instanceof Error ? err.message : String(err));
  } finally {
    clearTimeout(timer);
  }
}

async function probeApis(): Promise<void> {
  if (!key) return;

  await probeEndpoint(
    "Sonar chat/completions (MarketMonth runtime)",
    "https://api.perplexity.ai/chat/completions",
    {
      model: process.env.PERPLEXITY_SEO_MODEL?.trim() || "sonar",
      messages: [{ role: "user", content: "Reply with exactly: OK" }],
      max_tokens: 16,
    }
  );

  await probeEndpoint(
    "Agent API preset=fast (Cursor MCP perplexity_ask)",
    "https://api.perplexity.ai/v1/agent",
    {
      preset: "fast",
      input: "Reply with exactly: OK",
    }
  );

  await probeEndpoint(
    "Search API (Cursor MCP perplexity_search)",
    "https://api.perplexity.ai/search",
    {
      query: "test connectivity",
      max_results: 3,
    }
  );
}

async function main() {
  await probeApis();

  console.log("\n=== Perplexity doctor ===\n");
  for (const c of checks) {
    console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.name}`);
    console.log(`       ${c.detail}\n`);
  }

  const failed = checks.filter((c) => !c.ok).length;
  if (failed > 0) {
    console.log(`Result: ${failed} check(s) failed. See docs/ai/perplexity-api-key-runbook.md\n`);
    process.exitCode = 1;
  } else {
    console.log("Result: all checks passed.\n");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
