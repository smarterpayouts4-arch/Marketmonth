import { NextResponse } from "next/server";

import {
  getIdeaLabRun,
  listIdeaLabRuns,
  resetIdeaLabTopicHistory,
} from "@/brain/evaluation/idea-lab-store";

export const runtime = "nodejs";

function productionBlocked() {
  return NextResponse.json(
    { ok: false, error: "Idea Lab is production-impossible" },
    { status: 403 }
  );
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") return productionBlocked();
  const url = new URL(request.url);
  const runId = url.searchParams.get("runId");
  const compareA = url.searchParams.get("compareA");
  const compareB = url.searchParams.get("compareB");

  try {
    if (compareA && compareB) {
      const a = await getIdeaLabRun(compareA);
      const b = await getIdeaLabRun(compareB);
      return NextResponse.json({ ok: true, compare: { a, b } });
    }
    if (runId) {
      const run = await getIdeaLabRun(runId);
      if (!run) {
        return NextResponse.json(
          { ok: false, error: "Run not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ ok: true, run });
    }
    const runs = await listIdeaLabRuns();
    return NextResponse.json({ ok: true, runs });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "List failed",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  if (process.env.NODE_ENV === "production") return productionBlocked();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const record = body as {
    action?: string;
  };

  if (record.action === "reset_lab_history") {
    try {
      resetIdeaLabTopicHistory();
      return NextResponse.json({
        ok: true,
        reset: "lab_history",
        note: "Cleared data/runtime/idea-lab-topic-history.csv only. Product history untouched.",
      });
    } catch (err) {
      return NextResponse.json(
        {
          ok: false,
          error: err instanceof Error ? err.message : "Reset failed",
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { ok: false, error: "Unsupported action" },
    { status: 400 }
  );
}
