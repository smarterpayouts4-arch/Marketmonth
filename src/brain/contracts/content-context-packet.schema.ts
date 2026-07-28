import { z } from "zod";

/**
 * Provenance packet for a content run — not a dump of Project Knowledge.
 * Expand only when a second consumer needs more fields.
 */
export const CONTENT_CONTEXT_PACKET_SCHEMA_VERSION =
  "content-context-packet-v1" as const;

export const contentContextPacketSchema = z.object({
  schemaVersion: z.literal(CONTENT_CONTEXT_PACKET_SCHEMA_VERSION),
  companyId: z.string().min(1),
  brandCoreId: z.string().min(1),
  brandCoreHash: z.string().min(1),
  workflowStage: z.enum([
    "directions",
    "atom",
    "channel_package",
    "evaluation",
    "idea_lab",
  ]),
  selectedBrandCoreSections: z.array(z.string()),
  evidenceIds: z.array(z.string()),
  claimIds: z.array(z.string()),
  runtimeHistoryItemIds: z.array(z.string()),
  excludedSourceTypes: z.array(z.string()),
  freshness: z.enum(["fresh", "stale", "unknown"]),
  createdAt: z.string().min(1),
});

export type ContentContextPacket = z.infer<typeof contentContextPacketSchema>;
