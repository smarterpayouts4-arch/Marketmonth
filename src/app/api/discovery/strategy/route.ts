import { z } from "zod";

import { generateStrategyForIntent } from "@/engine/discovery";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  brandProfileId: z.string().optional(),
  brandProfile: z.record(z.string(), z.unknown()).optional(),
  goal: z.enum(["awareness", "leads", "sales", "loyalty"]),
  promoteFirst: z.string().min(1),
  reach: z.enum(["local", "national", "online_broad"]),
  targetLocation: z.string().min(1).max(160).optional(),
  growthDirection: z.string().min(1).max(80).optional(),
  growthThesis: z.string().min(1).max(400).optional(),
  buyerTension: z.string().min(1).max(200).optional(),
  brandCoreEdit: z.string().min(1).max(280).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid strategy request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (!parsed.data.brandProfileId && !parsed.data.brandProfile) {
    return Response.json(
      { error: "brandProfileId or brandProfile is required" },
      { status: 400 }
    );
  }

  try {
    const result = await generateStrategyForIntent(parsed.data);
    return Response.json({
      strategyPreview: result.strategyPreview,
      strategyPreviewId: result.strategyPreviewId,
      brandProfileId: result.brandProfileId,
      pageCount: result.pageCount ?? 0,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Strategy generation failed",
      },
      { status: 500 }
    );
  }
}
