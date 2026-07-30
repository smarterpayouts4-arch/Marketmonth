/**
 * Shared Postgres / Drizzle error classification.
 * Drizzle wraps driver errors, so codes and "does not exist" text often live
 * on `err.cause` rather than the top-level Error.
 */

export type PgErrorClass =
  | "missing_table"
  | "conflict"
  | "unavailable";

export type ClassifiedPgError = {
  reason: PgErrorClass;
  /** Postgres SQLSTATE when found (e.g. 42P01). */
  code?: string;
  detail: string;
};

function collectErrorChain(err: unknown): unknown[] {
  const out: unknown[] = [];
  let cur: unknown = err;
  let depth = 0;
  while (cur != null && depth < 6) {
    out.push(cur);
    if (typeof cur === "object" && cur !== null && "cause" in cur) {
      cur = (cur as { cause?: unknown }).cause;
    } else {
      break;
    }
    depth += 1;
  }
  return out;
}

function readCode(err: unknown): string | undefined {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code?: unknown }).code;
    if (typeof code === "string" && code.length > 0) return code;
  }
  return undefined;
}

function readMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/**
 * Classify a Postgres/Drizzle failure, walking the cause chain for SQLSTATE.
 */
export function classifyPgError(err: unknown): ClassifiedPgError {
  const chain = collectErrorChain(err);
  const detail = chain.map(readMessage).filter(Boolean).join(" | ") || String(err);
  let code: string | undefined;
  for (const node of chain) {
    const c = readCode(node);
    if (c) {
      code = c;
      break;
    }
  }

  if (
    code === "42P01" ||
    /does not exist/i.test(detail) ||
    /relation\s+"[^"]+"\s+does not exist/i.test(detail)
  ) {
    return { reason: "missing_table", code: code ?? "42P01", detail };
  }
  if (code === "23505" || /duplicate key|unique constraint/i.test(detail)) {
    return { reason: "conflict", code: code ?? "23505", detail };
  }
  return { reason: "unavailable", code, detail };
}

export function isMissingTableError(err: unknown): boolean {
  return classifyPgError(err).reason === "missing_table";
}
