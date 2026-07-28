import {
  buildTrace,
  endTimer,
} from "@/brain/evaluation/build-idea-lab-trace";
import { appendIdeaLabRun } from "@/brain/evaluation/idea-lab-store";
import type { IdeaLabRun } from "@/brain/evaluation/idea-lab.types";
import {
  IDEA_LAB_FIXTURE_NAME,
  IDEA_LAB_GENERATOR_VERSION,
  IDEA_LAB_PROVIDER_ID,
} from "@/brain/evaluation/idea-lab.types";

export async function finalizeFailedRun(args: {
  runId: string;
  runStarted: { startedAt: string; t0: number };
  drafts: Parameters<typeof buildTrace>[0];
  historyRepositoryPath: string;
  labHistoryRecordCountBefore: number;
  errors: string[];
  fixtureHash: string;
  topicMode?: "auto" | "manual";
  context?: {
    brandName: string;
    website?: string;
    products: string[];
    services: string[];
    audience?: string;
    contentOpportunities: string[];
    evidenceById: Record<string, unknown>;
  };
  identity?: {
    brand_core_id: string;
    brand_core_version: number;
    brand_core_hash: string;
  };
  brandCore?: { positioning: string; offers: string[]; proof_library: unknown[] };
  /** Gate failures should not pollute Lab runs history. */
  persist?: boolean;
}): Promise<IdeaLabRun> {
  const completed = endTimer(args.runStarted);
  const run: IdeaLabRun = {
    runId: args.runId,
    startedAt: completed.startedAt,
    completedAt: completed.completedAt,
    durationMs: completed.durationMs,
    input: {
      fixtureName: IDEA_LAB_FIXTURE_NAME,
      fixtureHash: args.fixtureHash,
      providerRequested: IDEA_LAB_PROVIDER_ID,
      providerUsed: IDEA_LAB_PROVIDER_ID,
      generatorVersion: IDEA_LAB_GENERATOR_VERSION,
      model: null,
      promptVersion: null,
      topicMode: args.topicMode ?? "manual",
      historyRepositoryPath: args.historyRepositoryPath,
      labHistoryRecordCountBefore: args.labHistoryRecordCountBefore,
    },
    contextSummary: {
      brandName: args.context?.brandName ?? "unknown",
      website: args.context?.website,
      products: args.context?.products ?? [],
      services: args.context?.services ?? [],
      audiences: args.context?.audience ? [args.context.audience] : [],
      contentOpportunities: args.context?.contentOpportunities ?? [],
      evidenceCount: args.context
        ? Object.keys(args.context.evidenceById).length
        : 0,
    },
    brandCoreSummary: {
      brandCoreId: args.identity?.brand_core_id ?? "",
      brandCoreVersion: args.identity?.brand_core_version ?? 0,
      brandCoreHash: args.identity?.brand_core_hash ?? "",
      positioningSummary: args.brandCore?.positioning,
      offers: args.brandCore?.offers ?? [],
      audiences: args.context?.audience ? [args.context.audience] : [],
      proofCount: args.brandCore?.proof_library.length ?? 0,
      usedAsPrimaryIdeaInput: false,
    },
    generation: {
      masterTopic: "",
      masterTopicRationale: null,
      rationaleNote: "Rationale not currently exposed by generator.",
      ideas: [],
    },
    influence: [],
    trace: buildTrace(args.drafts),
    generationSucceeded: false,
    historyPersisted: false,
    persistenceError: null,
    historyWarning: null,
    warnings: [],
    errors: args.errors,
  };
  if (args.persist !== false) {
    await appendIdeaLabRun(run);
  }
  return run;
}
