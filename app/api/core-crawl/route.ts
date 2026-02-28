import { NextResponse } from "next/server";
import { coreCrawl } from "@/lib/core/core-crawl";

export const runtime = "nodejs";

type CoreCrawlRequestBody = {
  targetUrl?: unknown;
  totalPages?: unknown;
};

function toPositiveInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    return null;
  }
  return value;
}

export async function POST(request: Request): Promise<Response> {
  let body: CoreCrawlRequestBody;
  try {
    body = (await request.json()) as CoreCrawlRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const targetUrl = typeof body.targetUrl === "string" ? body.targetUrl.trim() : "";
  const totalPages = toPositiveInt(body.totalPages);
  const profileId = process.env.CORE_PROFILE_ID;

  if (!targetUrl) {
    return NextResponse.json(
      { error: "targetUrl is required." },
      { status: 400 }
    );
  }

  try {
    new URL(targetUrl);
  } catch {
    return NextResponse.json(
      { error: "targetUrl must be a valid absolute URL." },
      { status: 400 }
    );
  }

  if (totalPages === null) {
    return NextResponse.json(
      { error: "totalPages must be a positive integer." },
      { status: 400 }
    );
  }

  if (!profileId) {
    return NextResponse.json(
      { error: "Missing CORE_PROFILE_ID environment variable." },
      { status: 500 }
    );
  }

  let profileCaptureDir: string | null = null;
  let browserUseUrl: string | null = null;
  const payloads: unknown[] = [];

  try {
    const result = await coreCrawl({
      targetUrl,
      profileId,
      totalPages,
      onUserPayload: async (payload) => {
        payloads.push(payload);
      },
      onBrowserUseUrl: async (url) => {
        browserUseUrl = url;
      },
      onProfileCaptureDir: async (captureDir) => {
        profileCaptureDir = captureDir;
      },
    });

    return NextResponse.json({
      browserUseUrl: browserUseUrl ?? result.browserUseUrl,
      payloadCount: result.payloadCount,
      profileCaptureDir: profileCaptureDir ?? result.profileCaptureDir,
      captureStats: result.captureStats,
      payloads,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
