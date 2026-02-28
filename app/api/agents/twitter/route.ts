import { NextResponse } from "next/server";
import { BrowserUse } from "browser-use-sdk";
import { z } from "zod";
import { Twitter_agent } from "@/agents";

const TwitterAgentRequestSchema = z.object({
  profileUrls: z.array(z.url()).min(1),
  sessionId: z.string().min(1).optional(),
  maxSteps: z.number().int().positive().optional(),
});

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = TwitterAgentRequestSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request body.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const apiKey = process.env.BROWSER_USE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Missing BROWSER_USE_API_KEY in environment. Add it to your .env.local file.",
        },
        { status: 500 },
      );
    }

    const client = new BrowserUse({ apiKey });
    const markdown = await Twitter_agent(parsed.data, client);

    return NextResponse.json({
      markdown,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error while running Twitter_agent.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 },
    );
  }
}
