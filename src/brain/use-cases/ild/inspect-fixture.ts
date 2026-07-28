import { readFileSync } from "node:fs";

import { parseFixtureCsv } from "@/brain/content/repository/parse-fixture-csv";
import { getBrandCore } from "@/brain/core";
import {
  getIdeaLabHistoryPath,
  labHistoryRecordCount,
} from "@/brain/evaluation/idea-lab-store";
import type { IdeaLabInspectResult } from "@/brain/evaluation/idea-lab.types";
import {
  IDEA_LAB_FIXTURE_NAME,
  IDEA_LAB_PROVIDER_ID,
} from "@/brain/evaluation/idea-lab.types";
import { topicHistoryCsvPath } from "@/brain/store/paths";
import { CsvShapeError, parseCsv } from "@/lib/dev/parse-csv";

import { assertDev } from "./dev-guard";
import { DEFAULT_FIXTURE, fixtureHash } from "./fixture";

export function inspectIdeaLabFixture(
  fixturePath = DEFAULT_FIXTURE
): IdeaLabInspectResult {
  assertDev();
  const historyRepositoryPath = getIdeaLabHistoryPath();
  const base: IdeaLabInspectResult = {
    fixtureName: IDEA_LAB_FIXTURE_NAME,
    fixtureHash: "",
    rowCount: 0,
    recordTypes: [],
    brandFields: [],
    evidenceCount: 0,
    parseError: null,
    brandCoreId: null,
    brandCoreVersion: null,
    brandCoreHash: null,
    brandName: null,
    historyRepositoryPath,
    labHistoryRecordCount: labHistoryRecordCount(),
    productHistoryPath: topicHistoryCsvPath(),
    providerStatus: [
      {
        id: IDEA_LAB_PROVIDER_ID,
        status: "active",
        label: "Active — Phase 1 evaluation provider",
      },
      {
        id: "intelligent-v1",
        status: "unavailable_for_lab_baseline",
        label: "Unavailable for Lab baseline",
      },
    ],
  };

  try {
    const text = readFileSync(fixturePath, "utf8");
    base.fixtureHash = fixtureHash(text);
    const grid = parseCsv(text);
    base.rowCount = Math.max(0, grid.length - 1);

    const context = parseFixtureCsv(text);
    if (!context) {
      base.parseError = "Fixture parsed but missing brandName/website";
      return base;
    }

    const recordTypes = new Set<string>();
    const brandFields: string[] = [];
    for (let r = 1; r < grid.length; r++) {
      const rt = (grid[r][0] ?? "").trim();
      if (rt) recordTypes.add(rt);
      if (rt === "brand_profile") {
        const field = (grid[r][1] ?? "").trim();
        if (field) brandFields.push(field);
      }
    }
    base.recordTypes = [...recordTypes];
    base.brandFields = brandFields;
    base.evidenceCount = Object.keys(context.evidenceById).length;
    base.brandName = context.brandName;

    const { identity } = getBrandCore(context.domain, { context });
    base.brandCoreId = identity.brand_core_id;
    base.brandCoreVersion = identity.brand_core_version;
    base.brandCoreHash = identity.brand_core_hash;
    return base;
  } catch (err) {
    base.parseError =
      err instanceof CsvShapeError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Fixture inspect failed";
    return base;
  }
}
