import { coreCrawl } from "@/lib/core/core-crawl";

export const runtime = "nodejs";

type CoreCrawlRequestBody = {
  targetUrl?: unknown;
  totalPages?: unknown;
};

type StreamEvent =
  | { type: "started" }
  | { type: "live_url"; browserUseUrl: string | null }
  | { type: "capture_dir"; profileCaptureDir: string }
  | { type: "payload"; payload: unknown; payloadCount: number }
  | {
      type: "done";
      browserUseUrl: string | null;
      payloadCount: number;
      profileCaptureDir: string | null;
      captureStats: {
        apiRequests: number;
        searchMatches: number;
        savedSearchResponses: number;
        emittedCandidates: number;
      } | null;
      payloads: unknown[];
    }
  | { type: "error"; error: string };

function toPositiveInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    return null;
  }
  return value;
}

function toJsonLine(event: StreamEvent): string {
  return `${JSON.stringify(event)}\n`;
}

export async function POST(request: Request): Promise<Response> {
  let body: CoreCrawlRequestBody;
  try {
    body = (await request.json()) as CoreCrawlRequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const targetUrl = typeof body.targetUrl === "string" ? body.targetUrl.trim() : "";
  const totalPages = toPositiveInt(body.totalPages);
  const profileId = process.env.CORE_PROFILE_ID;

  if (!targetUrl) {
    return Response.json({ error: "targetUrl is required." }, { status: 400 });
  }

  try {
    new URL(targetUrl);
  } catch {
    return Response.json(
      { error: "targetUrl must be a valid absolute URL." },
      { status: 400 }
    );
  }

  if (totalPages === null) {
    return Response.json(
      { error: "totalPages must be a positive integer." },
      { status: 400 }
    );
  }

  if (!profileId) {
    return Response.json(
      { error: "Missing CORE_PROFILE_ID environment variable." },
      { status: 500 }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let browserUseUrl: string | null = null;
      let profileCaptureDir: string | null = null;
      let payloadCount = 0;
      const payloads: unknown[] = [];

      const send = (event: StreamEvent): void => {
        controller.enqueue(encoder.encode(toJsonLine(event)));
      };

      const run = async (): Promise<void> => {
        send({ type: "started" });

        try {
          const result = await coreCrawl({
            targetUrl,
            profileId,
            totalPages,
            onUserPayload: async (payload) => {
              payloads.push(payload);
              payloadCount += 1;
              send({ type: "payload", payload, payloadCount });
            },
            onBrowserUseUrl: async (url) => {
              browserUseUrl = url;
              send({ type: "live_url", browserUseUrl: url });
            },
            onProfileCaptureDir: async (captureDir) => {
              profileCaptureDir = captureDir;
              send({ type: "capture_dir", profileCaptureDir: captureDir });
            },
          });

          send({
            type: "done",
            browserUseUrl: browserUseUrl ?? result.browserUseUrl,
            payloadCount: result.payloadCount,
            profileCaptureDir: profileCaptureDir ?? result.profileCaptureDir,
            captureStats: result.captureStats,
            payloads,
          });
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          send({ type: "error", error: message });
        } finally {
          controller.close();
        }
      };

      void run();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
