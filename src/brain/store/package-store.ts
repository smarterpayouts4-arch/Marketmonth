import { readJsonFile, writeJsonAtomic } from "./json-store";
import { packagePath } from "./paths";

export async function savePackageRecord(input: {
  packageId: string;
  channel: string;
  package: unknown;
}): Promise<void> {
  await writeJsonAtomic(packagePath(input.packageId), {
    kind: "package",
    channel: input.channel,
    savedAt: new Date().toISOString(),
    package: input.package,
  });
}

export function loadPackageRecord(packageId: string): unknown | null {
  const row = readJsonFile<{ package: unknown }>(packagePath(packageId));
  return row?.package ?? null;
}
