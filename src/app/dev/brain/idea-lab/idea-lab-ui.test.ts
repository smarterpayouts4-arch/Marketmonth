import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const root = path.join(process.cwd(), "src/app/dev/brain/idea-lab");

function read(name: string): string {
  return readFileSync(path.join(root, name), "utf8");
}

describe("Idea Lab UI sandbox structure", () => {
  it("does not import product Marketing Topic orchestration hooks", () => {
    const client = read("idea-lab-client.tsx");
    assert.equal(client.includes("use-content-directions"), false);
    assert.equal(client.includes("useContentDirections"), false);
    assert.equal(client.includes("content-directions-storage"), false);
    assert.equal(client.includes("/api/brain/content-directions"), false);
    assert.equal(client.includes("buildContentAtom"), false);
    assert.equal(client.includes("ContentAtom"), false);
  });

  it("calls only Idea Lab sandbox APIs", () => {
    const hook = read("use-idea-lab-sandbox.ts");
    assert.match(hook, /\/api\/dev\/brain\/idea-lab\/generate/);
    assert.match(hook, /\/api\/dev\/brain\/idea-lab\/runs/);
    assert.equal(
      read("idea-lab-client.tsx").includes("/api/brain/content-directions"),
      false
    );
  });

  it("gates Auto-generate on objective and uses candidates then directions stages", () => {
    const client = read("idea-lab-client.tsx");
    const hook = read("use-idea-lab-sandbox.ts");
    const candidatesPanel = read("idea-lab-candidates-panel.tsx");
    assert.match(
      hook,
      /Please select what you want this topic to accomplish/
    );
    assert.match(hook, /stage:\s*"candidates"/);
    assert.match(hook, /stage:\s*"directions"/);
    assert.match(candidatesPanel, /IdeaLabCandidateList/);
    assert.match(client, /IdeaLabCandidatesPanel/);
    assert.match(client, /useIdeaLabSandbox/);
    assert.equal(client.includes("Visual-only"), false);
  });

  it("surfaces educational disclaimer on candidate list", () => {
    const panel = read("idea-lab-candidates-panel.tsx");
    assert.match(panel, /idea-lab-content-disclaimer/);
    assert.match(panel, /does not provide\s+medical advice/i);
    assert.match(
      panel,
      /Viewers should\s+independently verify product information/
    );
  });

  it("shows candidate-engine and title-hook version copy from constants", () => {
    const client = read("idea-lab-client.tsx");
    assert.match(client, /IDEA_LAB_PROVIDER_ID/);
    assert.match(client, /TOPIC_TITLE_HOOK_VERSION/);
    assert.match(client, /@\/brain\/evaluation\/idea-lab\.types/);
    assert.equal(
      client.includes("@/brain/evaluation/gtc/"),
      false,
      "Idea Lab UI must not import gtc/ internals"
    );
    assert.match(client, /Candidate engine:/);
    assert.match(client, /Title hooks:/);
    assert.equal(client.includes("Baseline generator:"), false);
  });

  it("exposes thin Research Assist under helpful context", () => {
    const client = read("idea-lab-client.tsx");
    const hook = read("use-idea-lab-sandbox.ts");
    const panel = read("idea-lab-research-assist-panel.tsx");
    assert.match(client, /IdeaLabResearchAssistPanel/);
    assert.match(client, /open=\{lab\.contextExpanded\}/);
    assert.match(hook, /stage:\s*"research_prompt"/);
    assert.match(hook, /stage:\s*"research_validate"/);
    assert.match(hook, /researchImport/);
    assert.match(panel, /Research your company/);
    assert.match(panel, /Validate and use/);
    assert.match(panel, /Copy prompt/);
  });

  it("surfaces title-hook provenance via a small presentational badge", () => {
    const list = read("idea-lab-candidate-list.tsx");
    const badge = read("idea-lab-title-hook-badge.tsx");
    assert.match(list, /IdeaLabTitleHookBadge/);
    assert.match(badge, /titleItchType/);
    assert.match(badge, /trigger:/);
    assert.equal(badge.includes("generateTopicCandidates"), false);
  });

  it("reuses Marketing Topic presentational components", () => {
    const client = read("idea-lab-client.tsx");
    const directionsPanel = read("idea-lab-directions-panel.tsx");
    assert.match(client, /TopicCreationCard/);
    assert.match(directionsPanel, /ContentVariationGrid/);
    assert.match(client, /MarketingTopicHeader/);
    assert.match(client, /PhaseTabBar/);
  });

  it("keeps Test Inspector closed by default and behind a control", () => {
    const client = read("idea-lab-client.tsx");
    const hook = read("use-idea-lab-sandbox.ts");
    assert.match(
      hook,
      /useState\(false\).*inspectorOpen|inspectorOpen.*useState\(false\)/
    );
    assert.match(client, /open-test-inspector/);
    assert.match(client, /IdeaLabTestInspector/);
    assert.equal(client.includes("Fixture inspector"), false);
    assert.equal(client.includes("Zynava Idea Generation Test Bench"), false);
  });

  it("does not put absolute path dumps in the default client surface", () => {
    const client = read("idea-lab-client.tsx");
    assert.equal(client.includes("historyRepositoryPath"), false);
    assert.equal(client.includes("productHistoryPath"), false);
    assert.equal(client.includes("fixtureHash"), false);
  });

  it("evaluation drawer states no Content Atom creation", () => {
    const drawer = read("idea-lab-evaluation-drawer.tsx");
    assert.match(drawer, /does not create a Content Atom/i);
  });

  it("layout uses AppShell and remains production-blocked", () => {
    const layout = read("layout.tsx");
    assert.match(layout, /AppShell/);
    assert.match(layout, /production/);
    assert.match(layout, /notFound/);
  });

  it("mapper stays presentational", () => {
    const mapper = read("map-idea-to-variation.ts");
    assert.equal(mapper.includes("generateAndRecord"), false);
    assert.equal(mapper.includes("/api/"), false);
  });
});
