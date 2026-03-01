import { NextResponse } from "next/server";
import { BrowserUse } from "browser-use-sdk";
import { z } from "zod";
import { Devpost_agent } from "@/agents";
import { findFirstDevpostProfileByName } from "@/lib/firecrawl/devpost-search";

const DevpostAgentRequestSchema = z.object({
  fullName: z.string().trim().min(1),
  sessionId: z.string().min(1).optional(),
  maxSteps: z.number().int().positive().optional(),
});

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = DevpostAgentRequestSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request body.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const browserUseApiKey = process.env.BROWSER_USE_API_KEY;
    if (!browserUseApiKey) {
      return NextResponse.json(
        {
          error:
            "Missing BROWSER_USE_API_KEY in environment. Add it to your .env.local file.",
        },
        { status: 500 },
      );
    }

    const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
    if (!firecrawlApiKey) {
      return NextResponse.json(
        {
          error:
            "Missing FIRECRAWL_API_KEY in environment. Add it to your .env.local file.",
        },
        { status: 500 },
      );
    }

    const profileUrl = await findFirstDevpostProfileByName(parsed.data.fullName);
    if (!profileUrl) {
      return NextResponse.json({
        markdown: null,
        liveUrl: null,
        sessionId: null,
      });
    }

    const client = new BrowserUse({ apiKey: browserUseApiKey });
    const result = await Devpost_agent(
      {
        fullName: parsed.data.fullName,
        profileUrl,
        sessionId: parsed.data.sessionId,
        maxSteps: parsed.data.maxSteps,
      },
      client,
    );

    return NextResponse.json({
      markdown: result.markdown,
      liveUrl: result.liveUrl,
      sessionId: result.sessionId,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error while running Devpost_agent.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 },
    );
  }
}
