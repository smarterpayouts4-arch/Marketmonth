import path from "node:path";

export function runtimeRoot(): string {
  return path.join(process.cwd(), "data", "runtime");
}

export function handoffPath(generationId: string): string {
  return path.join(runtimeRoot(), "handoffs", `${sanitize(generationId)}.json`);
}

export function topicHistoryCsvPath(): string {
  return path.join(runtimeRoot(), "topic-generation-history.csv");
}

/** Isolated Idea Lab topic history — never the product history path. */
export function ideaLabTopicHistoryCsvPath(): string {
  return path.join(runtimeRoot(), "idea-lab-topic-history.csv");
}

export function ideaLabRunsJsonPath(): string {
  return path.join(runtimeRoot(), "idea-lab-runs.json");
}

export function atomPath(atomId: string): string {
  return path.join(runtimeRoot(), "atoms", `${sanitize(atomId)}.json`);
}

export function packagePath(packageId: string): string {
  return path.join(runtimeRoot(), "packages", `${sanitize(packageId)}.json`);
}

function sanitize(id: string): string {
  return id.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}
