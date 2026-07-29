import { NextResponse } from "next/server";

import { parseCompanyResearchImport } from "@/brain/evaluation/company-research-assist";
import { TOPIC_OBJECTIVE_REQUIRED } from "@/brain/evaluation/topic-candidate-types";
import { buildIdeaLabResearchPrompt } from "@/brain/use-cases/build-idea-lab-research-prompt";
import {
  parseIdeaLabGenerateRequest,
  type IdeaLabGenerateBody,
} from "@/brain/use-cases/ild/parse-generate-request";
import {
  inspectIdeaLabFixture,
  runIdeaLabDirections,
} from "@/brain/use-cases/run-idea-lab-directions";
import { runIdeaLabTopicCandidates } from "@/brain/use-cases/run-idea-lab-topic-candidates";

export const runtime = "nodejs";

function productionBlocked() {
  return NextResponse.json(
    { ok: false, error: "Idea Lab is production-impossible" },
    { status: 403 }
  );
}

export async function GET() {
  if (process.env.NODE_ENV === "production") return productionBlocked();
  try {
    const inspect = inspectIdeaLabFixture();
    return NextResponse.json({ ok: true, inspect });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Inspect failed",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") return productionBlocked();

  let body: IdeaLabGenerateBody = {};
  try {
    body = (await request.json()) as IdeaLabGenerateBody;
  } catch {
    body = {};
  }

  const parsed = parseIdeaLabGenerateRequest(body);
  if (!parsed.ok) {
    return NextResponse.json(
      {
        ok: false,
        code: parsed.code,
        error: parsed.error,
      },
      { status: parsed.status }
    );
  }

  try {
    if (parsed.stage === "research_prompt") {
      const outcome = buildIdeaLabResearchPrompt({
        companyId: "zynava.com",
        marketingFocus: parsed.marketingFocus,
      });
      if (!outcome.ok) {
        return NextResponse.json(
          {
            ok: false,
            code: outcome.code,
            error: outcome.error,
          },
          { status: outcome.status }
        );
      }
      return NextResponse.json({
        ok: true,
        stage: "research_prompt" as const,
        prompt: outcome.prompt,
        companyName: outcome.companyName,
      });
    }

    if (parsed.stage === "research_validate") {
      const validated = parseCompanyResearchImport(parsed.researchPaste);
      if (!validated.ok) {
        return NextResponse.json(
          { ok: false, error: validated.error },
          { status: 400 }
        );
      }
      return NextResponse.json({
        ok: true,
        stage: "research_validate" as const,
        researchImport: validated.value,
        findingCount: validated.value.findings.length,
      });
    }

    if (parsed.stage === "candidates") {
      const outcome = await runIdeaLabTopicCandidates({
        companyId: "zynava.com",
        marketingFocus: parsed.marketingFocus,
        researchImport: parsed.researchImport,
      });
      if (!outcome.ok) {
        return NextResponse.json(
          {
            ok: false,
            code: outcome.code,
            error: outcome.error,
          },
          { status: outcome.status }
        );
      }
      return NextResponse.json({
        ok: true,
        stage: "candidates" as const,
        candidates: outcome.result,
      });
    }

    const run = await runIdeaLabDirections({
      companyId: "zynava.com",
      topicMode: "manual",
      marketingFocus: parsed.marketingFocus,
      selectedCandidateId: parsed.selectedCandidateId,
      selectedTopicContext: parsed.selectedTopicContext,
      manualTopic: parsed.manualTopic,
    });

    if (
      !run.generationSucceeded &&
      run.errors.includes(TOPIC_OBJECTIVE_REQUIRED)
    ) {
      return NextResponse.json(
        {
          ok: false,
          code: TOPIC_OBJECTIVE_REQUIRED,
          error:
            run.errors.find((e) => e !== TOPIC_OBJECTIVE_REQUIRED) ??
            "Please select what you want this topic to accomplish.",
          run,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      stage: "directions" as const,
      run,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Generate failed",
      },
      { status: 500 }
    );
  }
}
