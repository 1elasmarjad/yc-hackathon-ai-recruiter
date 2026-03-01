import { NextResponse } from "next/server";
import { BrowserUse } from "browser-use-sdk";
import { z } from "zod";

const BrowserUseSessionRequestSchema = z.object({
  sessionId: z.string().min(1).optional(),
});

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = BrowserUseSessionRequestSchema.safeParse(json);

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

    if (parsed.data.sessionId) {
      const session = await client.sessions.get(parsed.data.sessionId);
      return NextResponse.json({
        sessionId: session.id,
        liveUrl: session.liveUrl ?? null,
      });
    }

    const session = await client.sessions.create();

    return NextResponse.json({
      sessionId: session.id,
      liveUrl: session.liveUrl ?? null,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error while preparing Browser Use session.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 },
    );
  }
}
