import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import {
  TOPIC_HISTORY_CSV_HEADERS,
  topicGenerationRecordSchema,
  type TopicGenerationEvaluation,
  type TopicGenerationRecord,
} from "@/brain/content/topic-generation-record.schema";
import { csvRowsToObjects, parseCsv } from "@/lib/dev/parse-csv";

import { runtimeRoot } from "./paths";
import type { TopicGenerationRepository } from "./topic-generation-repository";
import { withWriteLock } from "./write-lock";

const DEFAULT_HISTORY_RELATIVE = "topic-generation-history.csv";

function assertDevRuntime(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("brain/store CSV topic history is production-impossible");
  }
}

function historyPath(custom?: string): string {
  if (custom) {
    return path.isAbsolute(custom)
      ? custom
      : path.join(process.cwd(), custom);
  }
  return path.join(runtimeRoot(), DEFAULT_HISTORY_RELATIVE);
}

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function recordToRow(record: TopicGenerationRecord): string[] {
  const p = record.generation_provenance;
  return [
    record.generation_id,
    record.company_id,
    record.domain,
    record.brand_core_id,
    String(record.brand_core_version),
    record.brand_core_hash,
    record.mode,
    record.run_purpose,
    record.input_topic ?? "",
    record.normalized_input_topic ?? "",
    record.master_topic,
    record.master_topic_reason ?? "",
    JSON.stringify(record.directions),
    record.selected_direction_id ?? "",
    record.parent_generation_id ?? "",
    record.comparison_group_id ?? "",
    record.experiment_id ?? "",
    record.status,
    p.brain_version,
    p.prompt_version,
    p.provider,
    p.model ?? "",
    p.provider_config_hash ?? "",
    p.generation_code_version ?? "",
    record.evaluation ? JSON.stringify(record.evaluation) : "",
    record.novelty_context ? JSON.stringify(record.novelty_context) : "",
    record.intelligent_result !== undefined
      ? JSON.stringify(record.intelligent_result)
      : "",
    record.validation ? JSON.stringify(record.validation) : "",
    String(record.record_revision),
    record.created_at,
    record.updated_at,
  ];
}

function rowToRecord(row: Record<string, string>): TopicGenerationRecord {
  const directions = JSON.parse(row.directions_json || "[]");
  const evaluation = row.evaluation_json
    ? JSON.parse(row.evaluation_json)
    : undefined;
  const novelty = row.novelty_context_json
    ? JSON.parse(row.novelty_context_json)
    : undefined;

  return topicGenerationRecordSchema.parse({
    generation_id: row.generation_id,
    company_id: row.company_id,
    domain: row.domain,
    brand_core_id: row.brand_core_id,
    brand_core_version: Number(row.brand_core_version),
    brand_core_hash: row.brand_core_hash,
    mode: row.mode,
    run_purpose: row.run_purpose || "product",
    input_topic: row.input_topic || undefined,
    normalized_input_topic: row.normalized_input_topic || undefined,
    master_topic: row.master_topic,
    master_topic_reason: row.master_topic_reason || undefined,
    directions,
    selected_direction_id: row.selected_direction_id || undefined,
    parent_generation_id: row.parent_generation_id || undefined,
    comparison_group_id: row.comparison_group_id || undefined,
    experiment_id: row.experiment_id || undefined,
    status: row.status,
    generation_provenance: {
      brain_version: row.brain_version,
      prompt_version: row.prompt_version,
      provider: row.provider,
      model: row.model || undefined,
      provider_config_hash: row.provider_config_hash || undefined,
      generation_code_version: row.generation_code_version || undefined,
    },
    evaluation,
    novelty_context: novelty,
    intelligent_result: row.intelligent_result_json
      ? JSON.parse(row.intelligent_result_json)
      : undefined,
    validation: row.validation_json
      ? JSON.parse(row.validation_json)
      : undefined,
    record_revision: Number(row.record_revision || "1"),
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

function sortRecords(records: TopicGenerationRecord[]): TopicGenerationRecord[] {
  return [...records].sort((a, b) => {
    if (a.created_at !== b.created_at) {
      return a.created_at < b.created_at ? -1 : 1;
    }
    return a.generation_id < b.generation_id ? -1 : 1;
  });
}

function readAll(filePath: string): TopicGenerationRecord[] {
  if (!existsSync(filePath)) return [];
  const text = readFileSync(filePath, "utf8");
  if (!text.trim()) return [];
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const objects = csvRowsToObjects(rows);
  return objects.map(rowToRecord);
}

function writeAll(filePath: string, records: TopicGenerationRecord[]): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  const lines = [
    TOPIC_HISTORY_CSV_HEADERS.join(","),
    ...records.map((r) =>
      recordToRow(r).map((cell) => escapeCsvField(cell)).join(",")
    ),
  ];
  const payload = `${lines.join("\n")}\n`;
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, payload, "utf8");
  renameSync(tmp, filePath);
}

export function createCsvTopicGenerationRepository(options?: {
  filePath?: string;
}): TopicGenerationRepository {
  const filePath = historyPath(options?.filePath);

  async function mutate(
    fn: (records: TopicGenerationRecord[]) => TopicGenerationRecord
  ): Promise<TopicGenerationRecord> {
    assertDevRuntime();
    return withWriteLock(async () => {
      const records = readAll(filePath);
      const next = fn(records);
      writeAll(filePath, sortRecords(records));
      return next;
    });
  }

  return {
    async create(record) {
      const parsed = topicGenerationRecordSchema.parse(record);
      return mutate((records) => {
        if (records.some((r) => r.generation_id === parsed.generation_id)) {
          throw new Error(
            `TopicGenerationRecord already exists: ${parsed.generation_id}`
          );
        }
        records.push(parsed);
        return parsed;
      });
    },

    async getById(generationId) {
      assertDevRuntime();
      const records = readAll(filePath);
      return records.find((r) => r.generation_id === generationId) ?? null;
    },

    async listByCompany(companyId, options) {
      assertDevRuntime();
      const id = companyId.trim().toLowerCase();
      let rows = sortRecords(
        readAll(filePath).filter((r) => r.company_id === id)
      );
      if (options?.limit != null) rows = rows.slice(0, options.limit);
      return rows;
    },

    async listByNormalizedTopic(input) {
      assertDevRuntime();
      const companyId = input.companyId.trim().toLowerCase();
      const topic = input.normalizedTopic.trim().toLowerCase();
      let rows = sortRecords(
        readAll(filePath).filter(
          (r) =>
            r.company_id === companyId &&
            (r.normalized_input_topic ?? "").toLowerCase() === topic
        )
      );
      if (input.limit != null) rows = rows.slice(0, input.limit);
      return rows;
    },

    async listByComparisonGroup(comparisonGroupId) {
      assertDevRuntime();
      return sortRecords(
        readAll(filePath).filter(
          (r) => r.comparison_group_id === comparisonGroupId
        )
      );
    },

    async updateSelection(input) {
      return mutate((records) => {
        const idx = records.findIndex(
          (r) => r.generation_id === input.generationId
        );
        if (idx < 0) {
          throw new Error(`Unknown generation: ${input.generationId}`);
        }
        const current = records[idx];
        if (current.record_revision !== input.expectedRevision) {
          throw new Error(
            `Revision conflict for ${input.generationId}: expected ${input.expectedRevision}, got ${current.record_revision}`
          );
        }
        const next: TopicGenerationRecord = {
          ...current,
          selected_direction_id: input.selectedDirectionId,
          status:
            current.status === "generated" || current.status === "selected"
              ? "selected"
              : current.status,
          record_revision: current.record_revision + 1,
          updated_at: new Date().toISOString(),
        };
        records[idx] = topicGenerationRecordSchema.parse(next);
        return records[idx];
      });
    },

    async updateStatus(input) {
      return mutate((records) => {
        const idx = records.findIndex(
          (r) => r.generation_id === input.generationId
        );
        if (idx < 0) {
          throw new Error(`Unknown generation: ${input.generationId}`);
        }
        const current = records[idx];
        if (current.record_revision !== input.expectedRevision) {
          throw new Error(
            `Revision conflict for ${input.generationId}: expected ${input.expectedRevision}, got ${current.record_revision}`
          );
        }
        const next: TopicGenerationRecord = {
          ...current,
          status: input.status,
          record_revision: current.record_revision + 1,
          updated_at: new Date().toISOString(),
        };
        records[idx] = topicGenerationRecordSchema.parse(next);
        return records[idx];
      });
    },

    async saveEvaluation(input) {
      return mutate((records) => {
        const idx = records.findIndex(
          (r) => r.generation_id === input.generationId
        );
        if (idx < 0) {
          throw new Error(`Unknown generation: ${input.generationId}`);
        }
        const current = records[idx];
        if (current.record_revision !== input.expectedRevision) {
          throw new Error(
            `Revision conflict for ${input.generationId}: expected ${input.expectedRevision}, got ${current.record_revision}`
          );
        }
        const evaluation: TopicGenerationEvaluation = {
          ...input.evaluation,
          evaluated_at:
            input.evaluation.evaluated_at ?? new Date().toISOString(),
        };
        const next: TopicGenerationRecord = {
          ...current,
          evaluation,
          record_revision: current.record_revision + 1,
          updated_at: new Date().toISOString(),
        };
        records[idx] = topicGenerationRecordSchema.parse(next);
        return records[idx];
      });
    },
  };
}

/** Test helper: absolute path to default history CSV. */
export function defaultTopicHistoryCsvPath(): string {
  return historyPath();
}
