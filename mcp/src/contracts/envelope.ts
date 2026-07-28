export type Uncertainty = "low" | "medium" | "high";
export type ToolStatus = "complete" | "partial" | "failed";

export type ToolEnvelope<T> = {
  status: ToolStatus;
  data: T | null;
  source?: { path?: string; contentHash?: string; mtimeMs?: number };
  sources?: { url: string; retrievedAt: string }[];
  warnings: string[];
  uncertainty: Uncertainty;
  artifactType?: string;
  requiresHumanReview?: boolean;
  error?: string;
};

export function ok<T>(
  data: T,
  extra: Partial<ToolEnvelope<T>> = {}
): ToolEnvelope<T> {
  return {
    status: "complete",
    data,
    warnings: [],
    uncertainty: "low",
    ...extra,
  };
}

export function partial<T>(
  data: T,
  warnings: string[],
  uncertainty: Uncertainty = "medium"
): ToolEnvelope<T> {
  return { status: "partial", data, warnings, uncertainty };
}

export function failed(error: string, warnings: string[] = []): ToolEnvelope<null> {
  return {
    status: "failed",
    data: null,
    warnings,
    uncertainty: "high",
    error: redactSecrets(error),
  };
}

const SECRET_RE =
  /(api[_-]?key|secret|token|password|authorization)\s*[:=]\s*['"]?[^\s'"]+/gi;

export function redactSecrets(text: string): string {
  return text.replace(SECRET_RE, "$1=[REDACTED]");
}

export function asTextContent(envelope: ToolEnvelope<unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(envelope, null, 2) }],
  };
}
