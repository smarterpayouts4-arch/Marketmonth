import { NextResponse } from "next/server";
import OpenAI from "openai";

import { auth } from "@/auth";
import { isDevelopmentAuthBypassEnabled } from "@/lib/auth/auth-mode";
import {
  ASK_PROMPT_VERSION,
  buildAskSystemPrompt,
  buildAskUserMessage,
} from "@/lib/project-knowledge/ask-prompt";
import { checkAskRateLimit } from "@/lib/project-knowledge/ask-rate-limit";
import { buildAskContext } from "@/lib/project-knowledge/retrieve";
import { resolveModel } from "@/brain/policy/model-registry";

export const runtime = "nodejs";

const MAX_QUESTION_CHARS = 2000;
const MAX_BODY_BYTES = 16_384;
const MAX_CONTEXT_CHARS = 24_000;

async function authorizeAsk(): Promise<
  { ok: true } | { ok: false; status: number; error: string }
> {
  if (isDevelopmentAuthBypassEnabled()) {
    return { ok: true };
  }
  const session = await auth();
  if (!session?.user) {
    return { ok: false, status: 401, error: "Authentication required" };
  }
  return { ok: true };
}

/**
 * Read-only project-knowledge Q&A.
 * - Auth required in production; explicit dev bypass via auth-mode
 * - In-memory rate limit: local/single-instance only (not multi-instance prod)
 * - Never writes doctrine or code
 * - Never reads .env.local
 * - Sends only retrieved, sanitized context to OpenAI
 */
export async function POST(req: Request) {
  const authz = await authorizeAsk();
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: `Request body too large (max ${MAX_BODY_BYTES} bytes)` },
      { status: 413 }
    );
  }

  const rateKey =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local";
  const rate = checkAskRateLimit(rateKey);
  if (!rate.ok) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded (dev single-instance limiter)",
        retryAfterSec: rate.retryAfterSec,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSec) },
      }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured" },
      { status: 503 }
    );
  }

  let body: { question?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const question = (body.question || "").trim();
  if (!question || question.length > MAX_QUESTION_CHARS) {
    return NextResponse.json(
      { error: `question required (max ${MAX_QUESTION_CHARS} chars)` },
      { status: 400 }
    );
  }

  const { chunks, promptContext } = buildAskContext(question);
  const boundedContext =
    promptContext.length > MAX_CONTEXT_CHARS
      ? promptContext.slice(0, MAX_CONTEXT_CHARS)
      : promptContext;

  const model = resolveModel("discovery");

  try {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: buildAskSystemPrompt() },
        {
          role: "user",
          content: buildAskUserMessage(question, boundedContext),
        },
      ],
    });

    const answer =
      completion.choices[0]?.message?.content?.trim() ||
      "No answer generated.";

    return NextResponse.json({
      answer,
      sources: chunks.map((c) => ({ path: c.path, score: c.score })),
      model,
      promptVersion: ASK_PROMPT_VERSION,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Ask provider error";
    const safe = message.replace(/sk-[a-zA-Z0-9_-]+/g, "[REDACTED]");
    return NextResponse.json(
      { error: "Ask provider failed", detail: safe },
      { status: 502 }
    );
  }
}
