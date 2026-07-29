import { getBrandCoreRepository } from "@/brain/core";
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

import { assertDev } from "./dev-guard";

export function inspectIdeaLabFixture(
  fixturePath?: string,
  companyId = "zynava.com"
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
    const loaded = getBrandCoreRepository().getBrandCore(
      companyId,
      fixturePath ? { absolutePath: fixturePath } : undefined
    );
    base.fixtureHash = loaded.identity.brand_core_hash;
    base.brandName = loaded.context.brandName;
    base.evidenceCount = Object.keys(loaded.context.evidenceById).length;
    base.brandFields = [
      "businessName",
      "website",
      "indexedProducts",
      "products",
      "services",
    ];
    base.recordTypes = ["brand_profile", "evidence"];
    base.rowCount = base.evidenceCount + base.brandFields.length;
    base.brandCoreId = loaded.identity.brand_core_id;
    base.brandCoreVersion = loaded.identity.brand_core_version;
    base.brandCoreHash = loaded.identity.brand_core_hash;
    return base;
  } catch (err) {
    base.parseError =
      err instanceof Error ? err.message : "Fixture inspect failed";
    return base;
  }
}
