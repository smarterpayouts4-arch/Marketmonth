import {
  genericRenderRequestSchema,
  type GenericRenderRequest,
  type NormalizedRenderResult,
  type RenderMediaAdapter,
} from "./contracts";
import { resolveDefaultRenderAdapter } from "./resolve-render-adapter";

export type RenderMediaOptions = {
  /** Inject adapter for tests; default resolves from server config. */
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
  const adapter = options.adapter ?? resolveDefaultRenderAdapter();
  return adapter.render(parsed);
}
