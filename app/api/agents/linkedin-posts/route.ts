import { NextResponse } from "next/server";
import { BrowserUse } from "browser-use-sdk";
import Firecrawl from "@/lib/firecrawl/client";
import {
  Linkedin_posts_agent,
  type LinkedinPostsAgentResult,
} from "@/agents";
import {
  LinkedinPostsAgentInputSchema,
  LinkedinPostsAgentResultSchema,
} from "@/agents/linkedin-posts/schema";
import { LinkedinProfileUsernameNotFoundError } from "@/agents/linkedin-posts/run";

const LinkedinPostsAgentRequestSchema = LinkedinPostsAgentInputSchema;

type LinkedinPostsAgentRouteResponse = LinkedinPostsAgentResult;

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = LinkedinPostsAgentRequestSchema.safeParse(json);

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

    const browserUseClient = new BrowserUse({ apiKey: browserUseApiKey });
    const firecrawlClient = new Firecrawl({ apiKey: firecrawlApiKey });

    const result = await Linkedin_posts_agent(parsed.data, {
      browserUseClient,
      firecrawlClient,
    });

    const response: LinkedinPostsAgentRouteResponse = LinkedinPostsAgentResultSchema.parse(result);

    return NextResponse.json(response);
  } catch (error: unknown) {
    if (error instanceof LinkedinProfileUsernameNotFoundError) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 400 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Unknown error while running Linkedin_posts_agent.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 },
    );
  }
}
