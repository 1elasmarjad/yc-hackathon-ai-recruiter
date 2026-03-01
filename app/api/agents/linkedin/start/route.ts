import { NextResponse } from "next/server";
import { BrowserUse } from "browser-use-sdk";
import {
  buildLinkedinTaskPrompt,
  LINKEDIN_AGENT_SYSTEM_PROMPT,
} from "@/agents/linkedin/prompt";
import { LINKEDIN_ALLOWED_DOMAINS } from "@/agents/linkedin/query";
import { LinkedinAgentInputSchema } from "@/agents/linkedin/schema";
import { buildLinkedinSessionSettings } from "@/agents/linkedin/session-settings";

const LinkedinAgentStartRequestSchema = LinkedinAgentInputSchema;

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = LinkedinAgentStartRequestSchema.safeParse(json);

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
    const sessionSettings = !parsed.data.sessionId
      ? buildLinkedinSessionSettings({
          profileId: process.env.LINKEDIN_PROFILE_ID,
          proxyCountryCode: process.env.LINKEDIN_PROXY_COUNTRY_CODE,
        })
      : undefined;

    const task = await client.tasks.create({
      task: buildLinkedinTaskPrompt(parsed.data.profileUrl),
      startUrl: "https://www.google.com",
      allowedDomains: ["google.com", "www.google.com", ...LINKEDIN_ALLOWED_DOMAINS],
      systemPromptExtension: LINKEDIN_AGENT_SYSTEM_PROMPT,
      ...(parsed.data.sessionId ? { sessionId: parsed.data.sessionId } : {}),
      ...(parsed.data.maxSteps ? { maxSteps: parsed.data.maxSteps } : {}),
      ...(sessionSettings ? { sessionSettings } : {}),
    });

    const session = await client.sessions.get(task.sessionId);

    return NextResponse.json({
      taskId: task.id,
      sessionId: task.sessionId,
      liveUrl: session.liveUrl ?? null,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error while starting Linkedin_agent.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 },
    );
  }
}
