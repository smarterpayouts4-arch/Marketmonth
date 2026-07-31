import { randomUUID } from "node:crypto";

import {
  genericRenderRequestSchema,
  type GenericRenderRequest,
  type NormalizedRenderResult,
  type RenderMediaAdapter,
} from "../contracts";

export type DryRunAdapterOptions = {
  /** Test-only: force a normalized failure without network. */
  failWith?: { code: string; message: string; retryable: boolean };
};

/**
 * Phase 4A dry-run adapter — validates input, invents a job id, never creates media.
 */
export function createDryRunAdapter(
  options: DryRunAdapterOptions = {}
): RenderMediaAdapter {
  return {
    id: "dry-run",
    async render(request: GenericRenderRequest): Promise<NormalizedRenderResult> {
      const parsed = genericRenderRequestSchema.parse(request);
      const startedAt = new Date().toISOString();
      const rendererJobId = `dryrun_${randomUUID()}`;

      if (options.failWith) {
        return {
          requestId: parsed.requestId,
          rendererJobId,
          provider: "dry-run",
          mode: "dry_run",
          status: "failed",
          mediaKind: "image",
          error: options.failWith,
          requestedAt: parsed.requestedAt,
          startedAt,
          completedAt: new Date().toISOString(),
          providerMetadata: {
            promptLength: parsed.prompt.length,
            promptHash: parsed.promptHash,
          },
        };
      }

      return {
        requestId: parsed.requestId,
        rendererJobId,
        provider: "dry-run",
        mode: "dry_run",
        status: "succeeded",
        mediaKind: "image",
        requestedAt: parsed.requestedAt,
        startedAt,
        completedAt: new Date().toISOString(),
        providerMetadata: {
          promptLength: parsed.prompt.length,
          promptHash: parsed.promptHash,
          note: "dry_run_validation_only",
        },
      };
    },
  };
}

export const defaultDryRunAdapter = createDryRunAdapter();
