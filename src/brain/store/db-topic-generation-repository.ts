import { and, asc, eq } from "drizzle-orm";

import {
  topicGenerationRecordSchema,
  type TopicGenerationEvaluation,
  type TopicGenerationRecord,
} from "@/brain/content/topic-generation-record.schema";
import { getDb } from "@/db";
import { topicGenerations } from "@/db/schema";

import type { TopicGenerationRepository } from "./topic-generation-repository";

/**
 * Map a TopicGenerationRecord to the mirrored query columns + canonical
 * jsonb payload. The `record` column is the source of truth; the mirror
 * columns exist only for indexed filtering.
 */
export function recordToDbValues(record: TopicGenerationRecord): {
  generationId: string;
  companyId: string;
  domain: string;
  normalizedInputTopic: string | null;
  comparisonGroupId: string | null;
  status: string;
  recordRevision: number;
  record: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
} {
  return {
    generationId: record.generation_id,
    companyId: record.company_id.trim().toLowerCase(),
    domain: record.domain,
    normalizedInputTopic:
      record.normalized_input_topic?.trim().toLowerCase() ?? null,
    comparisonGroupId: record.comparison_group_id ?? null,
    status: record.status,
    recordRevision: record.record_revision,
    record: record as unknown as Record<string, unknown>,
    createdAt: new Date(record.created_at),
    updatedAt: new Date(record.updated_at),
  };
}

/** Parse the canonical jsonb payload back into a validated record. */
export function dbRowToRecord(row: {
  record: Record<string, unknown>;
}): TopicGenerationRecord {
  return topicGenerationRecordSchema.parse(row.record);
}

function revisionConflictError(
  generationId: string,
  expected: number,
  actual?: number
): Error {
  return new Error(
    `Revision conflict for ${generationId}: expected ${expected}, got ${actual ?? "different revision"}`
  );
}

export function createDbTopicGenerationRepository(): TopicGenerationRepository {
  async function readById(
    generationId: string
  ): Promise<TopicGenerationRecord | null> {
    const db = getDb();
    const [row] = await db
      .select({ record: topicGenerations.record })
      .from(topicGenerations)
      .where(eq(topicGenerations.generationId, generationId))
      .limit(1);
    return row ? dbRowToRecord(row) : null;
  }

  /**
   * Optimistic-concurrency update: the WHERE clause guards on the expected
   * revision so concurrent writers cannot both win. Zero updated rows after
   * an existence check means a raced revision — same error as the CSV port.
   */
  async function guardedUpdate(
    generationId: string,
    expectedRevision: number,
    apply: (current: TopicGenerationRecord) => TopicGenerationRecord
  ): Promise<TopicGenerationRecord> {
    const current = await readById(generationId);
    if (!current) {
      throw new Error(`Unknown generation: ${generationId}`);
    }
    if (current.record_revision !== expectedRevision) {
      throw revisionConflictError(
        generationId,
        expectedRevision,
        current.record_revision
      );
    }

    const next = topicGenerationRecordSchema.parse(apply(current));
    const values = recordToDbValues(next);
    const db = getDb();
    const updated = await db
      .update(topicGenerations)
      .set({
        normalizedInputTopic: values.normalizedInputTopic,
        comparisonGroupId: values.comparisonGroupId,
        status: values.status,
        recordRevision: values.recordRevision,
        record: values.record,
        updatedAt: values.updatedAt,
      })
      .where(
        and(
          eq(topicGenerations.generationId, generationId),
          eq(topicGenerations.recordRevision, expectedRevision)
        )
      )
      .returning({ generationId: topicGenerations.generationId });

    if (updated.length === 0) {
      throw revisionConflictError(generationId, expectedRevision);
    }
    return next;
  }

  return {
    async create(record) {
      const parsed = topicGenerationRecordSchema.parse(record);
      const existing = await readById(parsed.generation_id);
      if (existing) {
        throw new Error(
          `TopicGenerationRecord already exists: ${parsed.generation_id}`
        );
      }
      const db = getDb();
      await db.insert(topicGenerations).values(recordToDbValues(parsed));
      return parsed;
    },

    async getById(generationId) {
      return readById(generationId);
    },

    async listByCompany(companyId, options) {
      const id = companyId.trim().toLowerCase();
      const db = getDb();
      const base = db
        .select({ record: topicGenerations.record })
        .from(topicGenerations)
        .where(eq(topicGenerations.companyId, id))
        .orderBy(
          asc(topicGenerations.createdAt),
          asc(topicGenerations.generationId)
        );
      const rows =
        options?.limit != null ? await base.limit(options.limit) : await base;
      return rows.map(dbRowToRecord);
    },

    async listByNormalizedTopic(input) {
      const companyId = input.companyId.trim().toLowerCase();
      const topic = input.normalizedTopic.trim().toLowerCase();
      const db = getDb();
      const base = db
        .select({ record: topicGenerations.record })
        .from(topicGenerations)
        .where(
          and(
            eq(topicGenerations.companyId, companyId),
            eq(topicGenerations.normalizedInputTopic, topic)
          )
        )
        .orderBy(
          asc(topicGenerations.createdAt),
          asc(topicGenerations.generationId)
        );
      const rows =
        input.limit != null ? await base.limit(input.limit) : await base;
      return rows.map(dbRowToRecord);
    },

    async listByComparisonGroup(comparisonGroupId) {
      const db = getDb();
      const rows = await db
        .select({ record: topicGenerations.record })
        .from(topicGenerations)
        .where(eq(topicGenerations.comparisonGroupId, comparisonGroupId))
        .orderBy(
          asc(topicGenerations.createdAt),
          asc(topicGenerations.generationId)
        );
      return rows.map(dbRowToRecord);
    },

    async updateSelection(input) {
      return guardedUpdate(
        input.generationId,
        input.expectedRevision,
        (current) => ({
          ...current,
          selected_direction_id: input.selectedDirectionId,
          status:
            current.status === "generated" || current.status === "selected"
              ? "selected"
              : current.status,
          record_revision: current.record_revision + 1,
          updated_at: new Date().toISOString(),
        })
      );
    },

    async updateStatus(input) {
      return guardedUpdate(
        input.generationId,
        input.expectedRevision,
        (current) => ({
          ...current,
          status: input.status,
          record_revision: current.record_revision + 1,
          updated_at: new Date().toISOString(),
        })
      );
    },

    async saveEvaluation(input) {
      const evaluation: TopicGenerationEvaluation = {
        ...input.evaluation,
        evaluated_at: input.evaluation.evaluated_at ?? new Date().toISOString(),
      };
      return guardedUpdate(
        input.generationId,
        input.expectedRevision,
        (current) => ({
          ...current,
          evaluation,
          record_revision: current.record_revision + 1,
          updated_at: new Date().toISOString(),
        })
      );
    },
  };
}
