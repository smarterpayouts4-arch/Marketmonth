import OpenAI from "openai";

import { getSharedCircuitBreaker } from "./circuit-breaker";
import { getOpenAiSemaphore } from "./concurrency";
import { checkTenantTokenCap, recordTenantTokenUsage } from "./cost-caps";

/**
 * Shared OpenAI chat client for all brain adapters.
 * One place for timeout budget, bounded retry/backoff, structured-output
 * format, token-usage extraction, and resilience (P2.2: circuit breaker,
 * provider concurrency queue, per-tenant cost caps) — adapters own only
 * prompt + parsing.
 */

const DEFAULT_TIMEOUT_MS = 30_000;
/** Max retries after the first attempt (P1.1: 2 max). */
const DEFAULT_MAX_RETRIES = 2;
const BASE_BACKOFF_MS = 500;

export type BrainLlmJsonSchema = {
  /** snake_case identifier shown to the API. */
  name: string;
  /** Strict-mode JSON Schema (all fields required, additionalProperties false). */
  schema: Record<string, unknown>;
};

export type BrainLlmTokenUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

export type BrainLlmCallArgs = {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  temperature?: number;
  /**
   * Strict structured output (constrained decoding). When omitted the call
   * uses `json_object` — prefer a schema for any new adapter.
   */
  jsonSchema?: BrainLlmJsonSchema;
  timeoutMs?: number;
  maxRetries?: number;
  /**
   * Tenant scope for daily cost caps (P2.2). When set, the call is refused
   * once the company's daily token budget is spent, and usage is recorded
   * after successful calls.
   */
  costScope?: { companyId: string };
};

export type BrainLlmCallResult =
  | {
      ok: true;
      raw: string;
      tokenUsage?: BrainLlmTokenUsage;
      attempts: number;
    }
  | {
      ok: false;
      reason: "timeout" | "api_error";
      detail: string;
      attempts: number;
    };

function isTimeoutError(err: unknown, message: string): boolean {
  return (
    /timeout|timed out|ETIMEDOUT|AbortError/i.test(message) ||
    (err instanceof OpenAI.APIError && err.status === 408)
  );
}

function isRetryable(err: unknown, message: string): boolean {
  if (isTimeoutError(err, message)) return true;
  if (err instanceof OpenAI.APIError) {
    const status = err.status ?? 0;
    return status === 429 || status >= 500;
  }
  // Network-level failures without an HTTP status.
  return /ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|fetch failed/i.test(
    message
  );
}

function backoffMs(retryIndex: number): number {
  const base = BASE_BACKOFF_MS * 2 ** retryIndex;
  return base + Math.floor(Math.random() * 250);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callBrainLlm(
  args: BrainLlmCallArgs
): Promise<BrainLlmCallResult> {
  // Cost cap first: a refused call must not touch the circuit breaker.
  if (args.costScope) {
    const cap = await checkTenantTokenCap(args.costScope.companyId);
    if (!cap.ok) {
      return {
        ok: false,
        reason: "api_error",
        detail: `tenant_cost_cap_exceeded: ${cap.usedTokens}/${cap.capTokens} daily tokens used`,
        attempts: 0,
      };
    }
  }

  const breaker = getSharedCircuitBreaker(`openai:${args.model}`);
  if (!breaker.canProceed()) {
    return {
      ok: false,
      reason: "api_error",
      detail: `circuit_open: provider openai:${args.model} is cooling down after repeated failures`,
      attempts: 0,
    };
  }

  const release = await getOpenAiSemaphore().acquire();
  try {
    const result = await callOpenAiWithRetries(args);
    if (result.ok) {
      breaker.recordSuccess();
      if (args.costScope && result.tokenUsage?.totalTokens) {
        await recordTenantTokenUsage(
          args.costScope.companyId,
          result.tokenUsage.totalTokens
        );
      }
    } else {
      breaker.recordFailure();
    }
    return result;
  } finally {
    release();
  }
}

async function callOpenAiWithRetries(
  args: BrainLlmCallArgs
): Promise<BrainLlmCallResult> {
  const timeoutMs = args.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = Math.max(0, args.maxRetries ?? DEFAULT_MAX_RETRIES);
  const client = new OpenAI({ apiKey: args.apiKey, timeout: timeoutMs });

  const responseFormat = args.jsonSchema
    ? {
        type: "json_schema" as const,
        json_schema: {
          name: args.jsonSchema.name,
          strict: true,
          schema: args.jsonSchema.schema,
        },
      }
    : { type: "json_object" as const };

  let attempts = 0;
  let lastErr: unknown = null;
  let lastMessage = "";

  while (attempts <= maxRetries) {
    attempts += 1;
    try {
      const completion = await client.chat.completions.create({
        model: args.model,
        ...(args.temperature !== undefined
          ? { temperature: args.temperature }
          : {}),
        response_format: responseFormat,
        messages: [
          { role: "system", content: args.system },
          { role: "user", content: args.user },
        ],
      });
      const raw = completion.choices[0]?.message?.content ?? "";
      const usage = completion.usage;
      return {
        ok: true,
        raw,
        attempts,
        tokenUsage: usage
          ? {
              promptTokens: usage.prompt_tokens,
              completionTokens: usage.completion_tokens,
              totalTokens: usage.total_tokens,
            }
          : undefined,
      };
    } catch (err) {
      lastErr = err;
      lastMessage = err instanceof Error ? err.message : String(err);
      const canRetry = attempts <= maxRetries && isRetryable(err, lastMessage);
      if (!canRetry) break;
      await sleep(backoffMs(attempts - 1));
    }
  }

  return {
    ok: false,
    reason: isTimeoutError(lastErr, lastMessage) ? "timeout" : "api_error",
    detail: lastMessage,
    attempts,
  };
}
