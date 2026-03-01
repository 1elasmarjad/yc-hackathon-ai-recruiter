import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { WORKFLOW_DEFAULT_CANDIDATE_CONCURRENCY } from "@/lib/workflows/constants";
import {
  resolveWorkflowConcurrency,
  WorkflowStartRequestSchema,
  WorkflowStartResponseSchema,
} from "@/lib/workflows/schemas";
import { runWorkflowPipeline } from "@/lib/workflows/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_CONVEX_URL",
  "CORE_PROFILE_ID",
  "CORE_EMAIL",
  "CORE_PASSWORD",
  "BROWSER_USE_API_KEY",
  "FIRECRAWL_API_KEY",
] as const;

function findMissingEnvVars(): string[] {
  return REQUIRED_ENV_VARS.filter((name) => {
    const value = process.env[name];
    return !value || value.trim().length === 0;
  });
}

export async function POST(request: Request): Promise<Response> {
  let json: unknown;

  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = WorkflowStartRequestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request body.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const missingEnvVars = findMissingEnvVars();
  if (missingEnvVars.length > 0) {
    return NextResponse.json(
      {
        error: `Missing required environment variable(s): ${missingEnvVars.join(", ")}.`,
      },
      { status: 500 },
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

  try {
    const candidateConcurrency = resolveWorkflowConcurrency(
      parsed.data.candidateConcurrency ?? WORKFLOW_DEFAULT_CANDIDATE_CONCURRENCY,
    );

    const workflowName =
      parsed.data.name ?? `Juicebox Workflow ${new Date().toISOString()}`;

    const workflowId = await convex.mutation(api.workflows.createWorkflow, {
      name: workflowName,
      targetUrl: parsed.data.targetUrl,
      totalPages: parsed.data.totalPages,
      candidateConcurrency,
      aiCriteria: parsed.data.aiCriteria,
    });

    void runWorkflowPipeline({
      convexUrl,
      workflowId,
      targetUrl: parsed.data.targetUrl,
      totalPages: parsed.data.totalPages,
      candidateConcurrency,
      aiCriteria: parsed.data.aiCriteria,
    }).catch((error: unknown) => {
      console.error("[workflow] detached pipeline crashed", error);
    });

    const payload = WorkflowStartResponseSchema.parse({ workflowId });

    return NextResponse.json(payload, { status: 202 });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error while starting workflow.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
