import { NextResponse } from "next/server";
import { BrowserUse } from "browser-use-sdk";
import { z } from "zod";
import { toLinkedinMarkdown } from "@/agents/linkedin/markdown";
import { LinkedinAgentStructuredOutputSchema } from "@/agents/linkedin/schema";

const LinkedinAgentStatusQuerySchema = z.object({
  taskId: z.string().min(1),
});

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = LinkedinAgentStatusQuerySchema.safeParse({
      taskId: url.searchParams.get("taskId"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid query params.",
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
    const task = await client.tasks.get(parsed.data.taskId);
    const session = await client.sessions.get(task.sessionId);

    if (task.status === "created" || task.status === "started") {
      return NextResponse.json({
        status: "running",
        taskStatus: task.status,
        taskId: task.id,
        sessionId: task.sessionId,
        liveUrl: session.liveUrl ?? null,
      });
    }

    if (task.status !== "finished") {
      return NextResponse.json({
        status: "failed",
        taskStatus: task.status,
        taskId: task.id,
        sessionId: task.sessionId,
        liveUrl: session.liveUrl ?? null,
        error: "Task stopped before completion.",
      });
    }

    if (!task.output) {
      return NextResponse.json({
        status: "failed",
        taskStatus: task.status,
        taskId: task.id,
        sessionId: task.sessionId,
        liveUrl: session.liveUrl ?? null,
        error: "Task finished without output.",
      });
    }

    const outputJson = JSON.parse(task.output) as unknown;
    const structured = LinkedinAgentStructuredOutputSchema.parse(outputJson);
    const markdown = toLinkedinMarkdown(structured);

    return NextResponse.json({
      status: "completed",
      taskStatus: task.status,
      taskId: task.id,
      sessionId: task.sessionId,
      liveUrl: session.liveUrl ?? null,
      markdown,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error while checking Linkedin_agent status.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 },
    );
  }
}
