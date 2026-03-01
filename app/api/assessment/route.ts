import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { z } from "zod";
import { api } from "@/convex/_generated/api";

const AssessCandidateRequestSchema = z.object({
  aiCriteria: z.string().trim().min(1),
  candidateMarkdown: z.union([z.string().trim().min(1), z.array(z.string().trim().min(1)).min(1)]),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = AssessCandidateRequestSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request body.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      return NextResponse.json(
        {
          error: "Missing NEXT_PUBLIC_CONVEX_URL in environment.",
        },
        { status: 500 },
      );
    }

    const convex = new ConvexHttpClient(convexUrl);
    const result = await convex.action(api.assessment.assessCandidateFit, parsed.data);

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error while running assessment.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
