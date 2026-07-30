import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { readJsonFile, writeJsonAtomic } from "@/brain/store/json-store";
import {
  ideaLabRunsJsonPath,
  ideaLabTopicHistoryCsvPath,
} from "@/brain/store/paths";

import type { IdeaLabRun } from "./idea-lab.types";

const MAX_RUNS = 5;

function assertDev(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Idea Lab store is production-impossible");
  }
}

type StoreFile = { runs: IdeaLabRun[] };

export function getIdeaLabHistoryPath(): string {
  return ideaLabTopicHistoryCsvPath();
}

export function getIdeaLabRunsPath(): string {
  return ideaLabRunsJsonPath();
}

export async function listIdeaLabRuns(): Promise<IdeaLabRun[]> {
  assertDev();
  const data = readJsonFile<StoreFile>(ideaLabRunsJsonPath());
  return data?.runs ?? [];
}

export async function getIdeaLabRun(runId: string): Promise<IdeaLabRun | null> {
  const runs = await listIdeaLabRuns();
  return runs.find((r) => r.runId === runId) ?? null;
}

export async function appendIdeaLabRun(run: IdeaLabRun): Promise<IdeaLabRun> {
  assertDev();
  const existing = await listIdeaLabRuns();
  const next = [run, ...existing.filter((r) => r.runId !== run.runId)].slice(
    0,
    MAX_RUNS
  );
  await writeJsonAtomic(ideaLabRunsJsonPath(), { runs: next });
  return run;
}

/** Clears isolated Lab topic history only — never product history. */
export function resetIdeaLabTopicHistory(): void {
  assertDev();
  const filePath = ideaLabTopicHistoryCsvPath();
  mkdirSync(path.dirname(filePath), { recursive: true });
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }
  writeFileSync(filePath, "", "utf8");
}

export function labHistoryRecordCount(): number {
  assertDev();
  const filePath = ideaLabTopicHistoryCsvPath();
  if (!existsSync(filePath)) return 0;
  try {
    const text = readFileSync(filePath, "utf8");
    if (!text.trim()) return 0;
    const lines = text.trim().split(/\r?\n/);
    return Math.max(0, lines.length - 1);
  } catch {
    return 0;
  }
}
