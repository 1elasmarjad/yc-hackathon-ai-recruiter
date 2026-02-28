import { NextResponse } from "next/server";
import { BrowserUse } from "browser-use-sdk";
import { z } from "zod";
import { buildTwitterTaskPrompt, TWITTER_AGENT_SYSTEM_PROMPT } from "@/agents/twitter/prompt";
import { TWITTER_ALLOWED_DOMAINS } from "@/agents/twitter/query";
import { TwitterAgentInputSchema, TwitterAgentStructuredOutputSchema } from "@/agents/twitter/schema";

const TwitterAgentStartRequestSchema = TwitterAgentInputSchema;

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = TwitterAgentStartRequestSchema.safeParse(json);

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
    const task = await client.tasks.create({
      task: buildTwitterTaskPrompt(parsed.data.profileUrls),
      startUrl: parsed.data.profileUrls[0],
      allowedDomains: [...TWITTER_ALLOWED_DOMAINS],
      structuredOutput: JSON.stringify(z.toJSONSchema(TwitterAgentStructuredOutputSchema)),
      systemPromptExtension: TWITTER_AGENT_SYSTEM_PROMPT,
      ...(parsed.data.sessionId ? { sessionId: parsed.data.sessionId } : {}),
      ...(parsed.data.maxSteps ? { maxSteps: parsed.data.maxSteps } : {}),
      ...(process.env.TWITTER_PROFILE_ID && !parsed.data.sessionId
        ? { sessionSettings: { profileId: process.env.TWITTER_PROFILE_ID } }
        : {}),
    });

    const session = await client.sessions.get(task.sessionId);

    return NextResponse.json({
      taskId: task.id,
      sessionId: task.sessionId,
      liveUrl: session.liveUrl ?? null,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error while starting Twitter_agent.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 },
    );
  }
}
