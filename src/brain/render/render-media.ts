import { defaultDryRunAdapter } from "./adapters/dry-run-adapter";
import {
  genericRenderRequestSchema,
  type GenericRenderRequest,
  type NormalizedRenderResult,
  type RenderMediaAdapter,
} from "./contracts";

export type RenderMediaOptions = {
  /** Inject adapter for tests; default is dry-run (Phase 4A). */
  adapter?: RenderMediaAdapter;
};

/**
 * Shared provider-neutral media render entry.
 * Does not load/save channel bundles; callers own persistence.
 */
export async function renderMedia(
  request: GenericRenderRequest,
  options: RenderMediaOptions = {}
): Promise<NormalizedRenderResult> {
  const parsed = genericRenderRequestSchema.parse(request);
  const adapter = options.adapter ?? defaultDryRunAdapter;
  return adapter.render(parsed);
}
