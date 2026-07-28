import type {
  ContentAngle,
  ContentDirectionResult,
  ContentDirectionsHandoffV1,
  ContentVariation,
  MasterTopic,
} from "@/brain/content/types";

export type {
  ContentAngle,
  ContentDirectionResult,
  ContentDirectionsHandoffV1,
  ContentVariation,
  MasterTopic,
};

export type ReadyDirectionResult = Extract<
  ContentDirectionResult,
  { status: "ready" | "partially_ready" }
>;

export type BlockedDirectionResult = Extract<
  ContentDirectionResult,
  { status: "blocked" }
>;

export type ContentDirectionsApiResponse = {
  ok: boolean;
  result?: ContentDirectionResult;
  error?: string;
  meta?: {
    source?: string;
    provider?: string;
    mode?: string;
    domain?: string;
    generationId?: string | null;
    generationReason?: string;
    parentGenerationId?: string | null;
    similarTopicNotice?: string | null;
    noveltyRecentCount?: number;
    historyPersisted?: boolean;
    historyError?: string | null;
  };
};
