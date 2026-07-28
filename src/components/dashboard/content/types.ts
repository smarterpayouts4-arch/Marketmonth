import type { ContentAtom } from "@/brain/atom";
import type { StudioProductionPackage } from "@/brain/channels/youtube-short";
import type { ContentDirectionsHandoffV1 } from "@/brain/content/types";

import type {
  ContentChannel,
  ContentStudioChannel,
} from "./studio-channels";

export type ProductionPackage = StudioProductionPackage;

export type BrandCoreSummary = {
  name: string;
  domain: string;
  audience?: string;
  voice?: string;
  positioning?: string;
  offers: string[];
  evidenceCount: number;
  contextVersion: string;
};

export type ContentProductionApiResponse = {
  ok: boolean;
  error?: string;
  errors?: string[];
  atom?: ContentAtom;
  packages?: ProductionPackage[];
  brandCoreSummary?: BrandCoreSummary;
  status?: "not_connected";
  channel?: string;
};

export type ContentDraftV1 = {
  version: 1;
  atomId: string;
  channel: ContentChannel;
  format: string;
  selectedAssetId: string | null;
  packageVersion: number;
  savedAt: string;
};

export type StudioHandoffState =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "invalid"; errors: string[] }
  | { status: "ready"; handoff: ContentDirectionsHandoffV1 };

export type {
  ContentAtom,
  ContentChannel,
  ContentStudioChannel,
};
