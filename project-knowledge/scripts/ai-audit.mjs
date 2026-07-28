#!/usr/bin/env node
/**
 * Advisory AI architecture audit — never mutates official quality score.
 * Reads sanitized context only (no .env.local / secrets).
 */
import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generatedHeader, normalizeText, repoRoot } from "./lib/scan.mjs";

const AI_AUDIT_HEADER = generatedHeader(
  "project-knowledge/scripts/ai-audit.mjs"
);

const __filename = fileURLToPath(import.meta.url);
const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

function readSafe(root, rel, max = 12_000) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) return `(missing ${rel})`;
  return fs.readFileSync(full, "utf8").slice(0, max);
}

function loadDotEnvLocal(root) {
  const p = path.join(root, ".env.local");
  if (!fs.existsSync(p)) return {};
  const out = {};
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const k = t.slice(0, i);
    let v = t.slice(i + 1);
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

function runOpenAiAudit({ apiKey, model, prompt }) {
  const body = JSON.stringify({
    model,
    messages: [
      {
        role: "system",
        content:
          "You are an advisory architecture auditor for MarketMonth. List concrete observations and recommendations. Never invent secrets. Never claim to change the official deterministic score. Be concise.",
      },
      { role: "user", content: prompt },
    ],
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.openai.com",
        path: "/v1/chat/completions",
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          Connection: "close",
        },
        agent: false,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          if ((res.statusCode || 500) >= 400) {
            reject(
              new Error(
                `OpenAI audit HTTP ${res.statusCode}: ${text.slice(0, 300)}`
              )
            );
            return;
          }
          try {
            const data = JSON.parse(text);
            resolve({
              content:
                data.choices?.[0]?.message?.content?.trim() ||
                "(empty AI response)",
              returnedModel: data.model || null,
              httpStatus: res.statusCode,
            });
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("error", reject);
    req.setTimeout(120_000, () => {
      req.destroy(new Error("OpenAI audit timed out"));
    });
    req.write(body);
    req.end();
  });
}

export async function runAiAudit(root = repoRoot()) {
  const envFile = loadDotEnvLocal(root);
  const provider =
    process.env.PROJECT_AUDIT_PROVIDER ||
    envFile.PROJECT_AUDIT_PROVIDER ||
    "openai";
  const model =
    process.env.PROJECT_AUDIT_MODEL ||
    envFile.PROJECT_AUDIT_MODEL ||
    "gpt-5-mini";
  const apiKey = process.env.OPENAI_API_KEY || envFile.OPENAI_API_KEY || "";

  const contextFiles = [
    "project-knowledge/QUALITY_RUBRIC.md",
    "project-knowledge/ARCHITECTURE.md",
    "project-knowledge/CURRENT_STATE.md",
    "project-knowledge/generated/reports/QUALITY_SCORE.md",
    "project-knowledge/generated/reports/STRUCTURE_WARNINGS.md",
  ];
  const contextParts = contextFiles.map(
    (rel) => `## ${rel}\n${readSafe(root, rel, rel.includes("QUALITY_SCORE") ? 6000 : 4000)}`
  );
  const context = contextParts.join("\n\n");
  const contextSize = Buffer.byteLength(context, "utf8");

  const reportPath = path.join(
    root,
    "project-knowledge",
    "generated",
    "reports",
    "AI_AUDIT.md"
  );
  const jsonPath = path.join(
    root,
    "project-knowledge",
    "generated",
    "reports",
    "ai-audit.json"
  );
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });

  let status = "NOT_EVALUATED";
  let observations = "";
  let error = null;
  let returnedModel = null;
  let liveApi = false;
  let httpStatus = null;

  if (!apiKey) {
    status = "NOT_EVALUATED";
    observations =
      "AI audit NOT_EVALUATED — OPENAI_API_KEY not available. Official deterministic score is unchanged.";
  } else if (provider !== "openai") {
    status = "NOT_EVALUATED";
    observations = `AI audit NOT_EVALUATED — unsupported PROJECT_AUDIT_PROVIDER=${provider}`;
  } else {
    try {
      const result = await runOpenAiAudit({
        apiKey,
        model,
        prompt: `Review this sanitized MarketMonth context. Produce:\n1) Top architecture risks\n2) Independence / coupling concerns\n3) Documentation gaps\n4) Recommended next priorities\n\nDo not alter or claim the official score.\n\n${context}`,
      });
      observations = result.content;
      returnedModel = result.returnedModel;
      httpStatus = result.httpStatus;
      liveApi = true;
      status = "ok";
    } catch (e) {
      status = "error";
      error = e.message;
      liveApi = false;
      observations = `AI audit failed (NOT a successful live review): ${e.message}`;
    }
  }

  const md = normalizeText(
    [
      `# AI_AUDIT (advisory)`,
      ``,
      `## Provenance`,
      ``,
      `- Review type: \`Advisory AI review\``,
      `- Provider: \`${provider}\``,
      `- Requested model: \`${model}\``,
      `- Actual returned model: \`${returnedModel || "n/a"}\``,
      `- API execution status: \`${status}\``,
      `- HTTP status: \`${httpStatus ?? "n/a"}\``,
      `- Context files supplied: ${contextFiles.map((f) => `\`${f}\``).join(", ")}`,
      `- Context size: \`${contextSize}\` bytes`,
      `- Response generated from live API: \`${liveApi ? "yes" : "no"}\``,
      `- AI affects official score: \`no\``,
      `- Secrets in context: \`excluded\` (.env.local never sent; only sanitized docs)`,
      ``,
      `> This report does **not** change the Internal Engineering Quality Score.`,
      ``,
      `## Observations`,
      ``,
      observations,
      ``,
    ].join("\n")
  );

  const payload = {
    schemaVersion: 2,
    reviewType: "Advisory AI review",
    status,
    provider,
    requestedModel: model,
    returnedModel,
    apiExecutionStatus: status,
    httpStatus,
    contextFiles,
    contextSize,
    responseGeneratedFromLiveApi: liveApi,
    aiAffectsOfficialScore: false,
    secretsExcluded: true,
    error,
    advisoryOnly: true,
    observations,
  };

  fs.writeFileSync(reportPath, AI_AUDIT_HEADER + md, "utf8");
  fs.writeFileSync(
    jsonPath,
    normalizeText(JSON.stringify(payload, null, 2)),
    "utf8"
  );
  return payload;
}

if (isMain) {
  const result = await runAiAudit(repoRoot());
  console.error(`ai:audit — status=${result.status}`);
  // Advisory only: never hard-fail the shell on provider errors.
  process.exit(0);
}
