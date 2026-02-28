"use client";

import { FormEvent, useState } from "react";

type CoreCrawlResponse = {
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
};

type StreamEvent =
  | { type: "started" }
  | { type: "live_url"; browserUseUrl: string | null }
  | { type: "capture_dir"; profileCaptureDir: string }
  | { type: "payload"; payload: unknown; payloadCount: number }
  | CoreCrawlResponseEvent
  | { type: "error"; error: string };

type CoreCrawlResponseEvent = {
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
};

export default function CoreCrawlPage() {
  const [targetUrl, setTargetUrl] = useState("");
  const [totalPages, setTotalPages] = useState("1");
  const [isRunning, setIsRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<CoreCrawlResponse | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setResult(null);

    const parsedPages = Number.parseInt(totalPages, 10);
    if (!Number.isInteger(parsedPages) || parsedPages < 1) {
      setErrorMessage("Total pages must be a positive integer.");
      return;
    }

    setIsRunning(true);
    try {
      const response = await fetch("/api/core-crawl/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetUrl,
          totalPages: parsedPages,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        const message =
          "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "Failed to run crawl.";
        throw new Error(message);
      }

      if (!response.body) {
        throw new Error("Missing response body for crawl stream.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      let nextBrowserUseUrl: string | null = null;
      let nextProfileCaptureDir: string | null = null;
      let nextCaptureStats: CoreCrawlResponse["captureStats"] = null;
      let nextPayloadCount = 0;
      let nextPayloads: unknown[] = [];

      const syncResult = (): void => {
        setResult({
          browserUseUrl: nextBrowserUseUrl,
          profileCaptureDir: nextProfileCaptureDir,
          captureStats: nextCaptureStats,
          payloadCount: nextPayloadCount,
          payloads: nextPayloads,
        });
      };

      const processLine = (line: string): void => {
        if (!line) {
          return;
        }

        const event = JSON.parse(line) as StreamEvent;
        if (event.type === "started") {
          return;
        }

        if (event.type === "live_url") {
          nextBrowserUseUrl = event.browserUseUrl;
          syncResult();
          return;
        }

        if (event.type === "capture_dir") {
          nextProfileCaptureDir = event.profileCaptureDir;
          syncResult();
          return;
        }

        if (event.type === "payload") {
          nextPayloadCount = event.payloadCount;
          nextPayloads = [...nextPayloads, event.payload];
          syncResult();
          return;
        }

        if (event.type === "done") {
          nextBrowserUseUrl = event.browserUseUrl;
          nextProfileCaptureDir = event.profileCaptureDir;
          nextPayloadCount = event.payloadCount;
          nextCaptureStats = event.captureStats;
          nextPayloads = event.payloads;
          syncResult();
          return;
        }

        if (event.type === "error") {
          throw new Error(event.error || "Crawl failed.");
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        let newlineIndex = buffer.indexOf("\n");
        while (newlineIndex >= 0) {
          const rawLine = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          processLine(rawLine.trim());
          newlineIndex = buffer.indexOf("\n");
        }
      }

      const finalLine = buffer.trim();
      if (finalLine) {
        processLine(finalLine);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setErrorMessage(message);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-14 text-neutral-100">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight">Core Crawl</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Submit a Core/Juicebox search URL and how many pages to process.
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5"
        >
          <label className="block">
            <span className="mb-2 block text-sm text-neutral-300">Target URL</span>
            <input
              type="url"
              required
              value={targetUrl}
              onChange={(event) => setTargetUrl(event.target.value)}
              placeholder="https://app.juicebox.work/..."
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none ring-0 placeholder:text-neutral-500 focus:border-neutral-500"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-neutral-300">Total Pages</span>
            <input
              type="number"
              min={1}
              step={1}
              required
              value={totalPages}
              onChange={(event) => setTotalPages(event.target.value)}
              className="w-40 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none ring-0 focus:border-neutral-500"
            />
          </label>

          <button
            type="submit"
            disabled={isRunning}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-300"
          >
            {isRunning ? "Running..." : "Run Crawl"}
          </button>
        </form>

        {errorMessage ? (
          <div className="mt-5 rounded-lg border border-red-800 bg-red-950/30 p-3 text-sm text-red-300">
            {errorMessage}
          </div>
        ) : null}

        {isRunning && result?.browserUseUrl ? (
          <div className="mt-5 rounded-lg border border-emerald-800 bg-emerald-950/30 p-3 text-sm text-emerald-200">
            Live URL:{" "}
            <a
              href={result.browserUseUrl}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              {result.browserUseUrl}
            </a>
          </div>
        ) : null}

        {result?.browserUseUrl ? (
          <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
            <h2 className="text-base font-medium text-neutral-100">
              Live Browser View
            </h2>
            <p className="mt-2 text-sm text-neutral-400">
              If this frame is blank, open the link in a new tab (some sites
              block embedding).
            </p>
            <div className="mt-4 overflow-hidden rounded-lg border border-neutral-800 bg-black">
              <iframe
                src={result.browserUseUrl}
                title="Browser Use Live View"
                className="h-[560px] w-full"
                allow="clipboard-read; clipboard-write"
              />
            </div>
          </section>
        ) : null}

        {result ? (
          <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 text-sm">
            <h2 className="text-base font-medium text-neutral-100">Run Result</h2>
            <div className="mt-3 space-y-2 text-neutral-300">
              <p>Payload Count: {result.payloadCount}</p>
              <p>
                API Requests Seen: {result.captureStats?.apiRequests ?? "Unknown"}
              </p>
              <p>
                Search Matches Seen: {result.captureStats?.searchMatches ?? "Unknown"}
              </p>
              <p>
                Saved Search Responses:{" "}
                {result.captureStats?.savedSearchResponses ?? "Unknown"}
              </p>
              <p>
                Emitted Candidates:{" "}
                {result.captureStats?.emittedCandidates ?? "Unknown"}
              </p>
              <p>
                Live URL:{" "}
                {result.browserUseUrl ? (
                  <a
                    href={result.browserUseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-300 underline underline-offset-2"
                  >
                    {result.browserUseUrl}
                  </a>
                ) : (
                  "Not available"
                )}
              </p>
              <p>Capture Dir: {result.profileCaptureDir ?? "Not saved"}</p>
            </div>
            <div className="mt-4">
              <p className="mb-2 text-neutral-200">Extracted Payloads</p>
              <pre className="max-h-96 overflow-auto rounded-lg border border-neutral-800 bg-neutral-950 p-3 text-xs text-neutral-300">
                {JSON.stringify(result.payloads, null, 2)}
              </pre>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
