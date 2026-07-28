import { createHash } from "node:crypto";

import { defaultFixtureAbsolute } from "@/brain/content/repository/default-fixture";

export const DEFAULT_FIXTURE = defaultFixtureAbsolute();

export function fixtureHash(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}
