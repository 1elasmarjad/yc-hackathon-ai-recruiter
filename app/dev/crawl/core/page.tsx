"use client";

import { FormEvent, useMemo, useState, type ReactElement } from "react";
import type { JuiceboxCandidate } from "@/agents/core/jb-schema";
import {
  formatJuiceboxCandidate,
  type CandidateEducationItem,
  type CandidateLinkItem,
  type CandidateTimelineItem,
  type FormattedJuiceboxCandidate,
} from "@/lib/core/candidate-format";

type CaptureStats = {
  apiRequests: number;
  searchMatches: number;
  savedSearchResponses: number;
  emittedCandidates: number;
};

type InvalidCorePayload = {
  error: string;
  payload: unknown;
};

type CoreCrawlResponse = {
  browserUseUrl: string | null;
  payloadCount: number;
  invalidPayloadCount: number;
  profileCaptureDir: string | null;
  captureStats: CaptureStats | null;
  payloads: JuiceboxCandidate[];
  rawPayloads: unknown[];
  invalidPayloads: InvalidCorePayload[];
};

type StreamEvent =
  | { type: "started" }
  | { type: "live_url"; browserUseUrl: string | null }
  | { type: "capture_dir"; profileCaptureDir: string }
  | {
      type: "payload";
      payload: JuiceboxCandidate;
      rawPayload: unknown;
      payloadCount: number;
    }
  | {
      type: "invalid_payload";
      error: string;
      payload: unknown;
      invalidPayloadCount: number;
    }
  | CoreCrawlResponseEvent
  | { type: "error"; error: string };

type CoreCrawlResponseEvent = {
  type: "done";
  browserUseUrl: string | null;
  payloadCount: number;
  invalidPayloadCount: number;
  profileCaptureDir: string | null;
  captureStats: CaptureStats | null;
  payloads: JuiceboxCandidate[];
  rawPayloads: unknown[];
  invalidPayloads: InvalidCorePayload[];
};

export default function CoreCrawlPage() {
  const [targetUrl, setTargetUrl] = useState<string>("");
  const [totalPages, setTotalPages] = useState<string>("1");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<CoreCrawlResponse | null>(null);
  const formattedPayloads = useMemo<FormattedJuiceboxCandidate[]>(
    () =>
      (result?.payloads ?? []).map((payload) => formatJuiceboxCandidate(payload)),
    [result?.payloads]
  );

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
      let nextInvalidPayloadCount = 0;
      let nextPayloads: JuiceboxCandidate[] = [];
      let nextRawPayloads: unknown[] = [];
      let nextInvalidPayloads: InvalidCorePayload[] = [];

      const syncResult = (): void => {
        setResult({
          browserUseUrl: nextBrowserUseUrl,
          profileCaptureDir: nextProfileCaptureDir,
          captureStats: nextCaptureStats,
          payloadCount: nextPayloadCount,
          invalidPayloadCount: nextInvalidPayloadCount,
          payloads: nextPayloads,
          rawPayloads: nextRawPayloads,
          invalidPayloads: nextInvalidPayloads,
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
          nextRawPayloads = [...nextRawPayloads, event.rawPayload];
          syncResult();
          return;
        }

        if (event.type === "invalid_payload") {
          nextInvalidPayloadCount = event.invalidPayloadCount;
          nextInvalidPayloads = [
            ...nextInvalidPayloads,
            { error: event.error, payload: event.payload },
          ];
          nextRawPayloads = [...nextRawPayloads, event.payload];
          syncResult();
          return;
        }

        if (event.type === "done") {
          nextBrowserUseUrl = event.browserUseUrl;
          nextProfileCaptureDir = event.profileCaptureDir;
          nextPayloadCount = event.payloadCount;
          nextInvalidPayloadCount = event.invalidPayloadCount;
          nextCaptureStats = event.captureStats;
          nextPayloads = event.payloads;
          nextRawPayloads = event.rawPayloads;
          nextInvalidPayloads = event.invalidPayloads;
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
              <p>Parsed Candidates: {formattedPayloads.length}</p>
              <p>Invalid Payloads: {result.invalidPayloadCount}</p>
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
            <div className="mt-6">
              <h3 className="text-sm font-medium text-neutral-200">
                Candidate Visualization
              </h3>
              {formattedPayloads.length === 0 ? (
                <p className="mt-2 text-xs text-neutral-400">
                  No candidate payloads parsed yet.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  {formattedPayloads.map((candidate) => (
                    <CandidateCard key={candidate.id} candidate={candidate} />
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 space-y-3">
              <details className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3">
                <summary className="cursor-pointer text-sm font-medium text-neutral-200">
                  Parsed Payload JSON ({result.payloads.length})
                </summary>
                <pre className="mt-3 max-h-80 overflow-auto rounded-md border border-neutral-800 bg-neutral-950 p-3 text-xs text-neutral-300">
                  {JSON.stringify(result.payloads, null, 2)}
                </pre>
              </details>

              <details className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3">
                <summary className="cursor-pointer text-sm font-medium text-neutral-200">
                  Raw Payload JSON ({result.rawPayloads.length})
                </summary>
                <pre className="mt-3 max-h-80 overflow-auto rounded-md border border-neutral-800 bg-neutral-950 p-3 text-xs text-neutral-300">
                  {JSON.stringify(result.rawPayloads, null, 2)}
                </pre>
              </details>

              <details className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3">
                <summary className="cursor-pointer text-sm font-medium text-neutral-200">
                  Invalid Payload JSON ({result.invalidPayloads.length})
                </summary>
                <pre className="mt-3 max-h-80 overflow-auto rounded-md border border-neutral-800 bg-neutral-950 p-3 text-xs text-neutral-300">
                  {JSON.stringify(result.invalidPayloads, null, 2)}
                </pre>
              </details>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function CandidateCard({
  candidate,
}: {
  candidate: FormattedJuiceboxCandidate;
}): ReactElement {
  return (
    <article className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-4">
      <header className="flex flex-col gap-2 border-b border-neutral-800 pb-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h4 className="text-base font-semibold text-neutral-100">{candidate.name}</h4>
          <p className="text-xs text-neutral-400">ID: {candidate.id}</p>
          {candidate.headline ? (
            <p className="mt-1 text-sm text-neutral-200">{candidate.headline}</p>
          ) : null}
        </div>
        <div className="text-xs text-neutral-400 md:text-right">
          {candidate.location ? <p>{candidate.location}</p> : null}
          {candidate.totalExperienceMonths !== null ? (
            <p>{formatExperienceLabel(candidate.totalExperienceMonths)}</p>
          ) : null}
        </div>
      </header>

      {candidate.profileHighlight ? (
        <p className="mt-3 text-sm text-emerald-300">{candidate.profileHighlight}</p>
      ) : null}

      {candidate.summary ? (
        <p className="mt-2 whitespace-pre-line text-sm text-neutral-300">
          {candidate.summary}
        </p>
      ) : null}

      {candidate.skills.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {candidate.skills.slice(0, 20).map((skill) => (
            <span
              key={skill}
              className="rounded-md border border-emerald-800/70 bg-emerald-950/40 px-2 py-1 text-xs text-emerald-200"
            >
              {skill}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section>
          <h5 className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            Contact
          </h5>
          <div className="mt-2 space-y-2 text-sm">
            <ContactLinks
              label="Emails"
              items={candidate.emails}
              hrefPrefix="mailto:"
              emptyLabel="No emails"
            />
            <ContactLinks
              label="Phones"
              items={candidate.phones}
              hrefPrefix="tel:"
              emptyLabel="No phone numbers"
            />
          </div>
        </section>

        <section>
          <h5 className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            Links
          </h5>
          <div className="mt-2">
            <ExternalLinks items={candidate.links} />
          </div>
          {candidate.languages.length > 0 ? (
            <p className="mt-3 text-xs text-neutral-400">
              Languages: {candidate.languages.join(", ")}
            </p>
          ) : null}
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section>
          <h5 className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            Experience
          </h5>
          <TimelineList
            items={candidate.experience}
            emptyLabel="No experience entries"
          />
        </section>
        <section>
          <h5 className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            Education
          </h5>
          <EducationList
            items={candidate.education}
            emptyLabel="No education entries"
          />
        </section>
      </div>
    </article>
  );
}

function TimelineList({
  items,
  emptyLabel,
}: {
  items: CandidateTimelineItem[];
  emptyLabel: string;
}): ReactElement {
  if (items.length === 0) {
    return <p className="mt-2 text-xs text-neutral-500">{emptyLabel}</p>;
  }

  return (
    <ul className="mt-2 space-y-3 text-sm text-neutral-300">
      {items.slice(0, 6).map((item) => (
        <li key={`${item.heading}-${item.dateRange ?? "no-date"}`}>
          <p className="font-medium text-neutral-100">{item.heading}</p>
          {item.subheading ? <p>{item.subheading}</p> : null}
          {item.dateRange ? (
            <p className="text-xs text-neutral-400">{item.dateRange}</p>
          ) : null}
          {item.location ? (
            <p className="text-xs text-neutral-400">Location: {item.location}</p>
          ) : null}
          {item.summary ? (
            <p className="mt-1 text-xs text-neutral-400">{item.summary}</p>
          ) : null}
        </li>
      ))}
      {items.length > 6 ? (
        <li className="text-xs text-neutral-500">+{items.length - 6} more roles</li>
      ) : null}
    </ul>
  );
}

function EducationList({
  items,
  emptyLabel,
}: {
  items: CandidateEducationItem[];
  emptyLabel: string;
}): ReactElement {
  if (items.length === 0) {
    return <p className="mt-2 text-xs text-neutral-500">{emptyLabel}</p>;
  }

  return (
    <ul className="mt-2 space-y-3 text-sm text-neutral-300">
      {items.slice(0, 4).map((item) => (
        <li key={`${item.heading}-${item.dateRange ?? "no-date"}`}>
          <p className="font-medium text-neutral-100">{item.heading}</p>
          {item.subheading ? <p>{item.subheading}</p> : null}
          {item.dateRange ? (
            <p className="text-xs text-neutral-400">{item.dateRange}</p>
          ) : null}
          {item.summary ? (
            <p className="mt-1 text-xs text-neutral-400">{item.summary}</p>
          ) : null}
        </li>
      ))}
      {items.length > 4 ? (
        <li className="text-xs text-neutral-500">+{items.length - 4} more entries</li>
      ) : null}
    </ul>
  );
}

function ContactLinks({
  label,
  items,
  hrefPrefix,
  emptyLabel,
}: {
  label: string;
  items: string[];
  hrefPrefix: "mailto:" | "tel:";
  emptyLabel: string;
}): ReactElement {
  if (items.length === 0) {
    return (
      <p className="text-xs text-neutral-500">
        {label}: {emptyLabel}
      </p>
    );
  }

  return (
    <p className="text-xs text-neutral-300">
      {label}:{" "}
      {items.map((item, index) => (
        <span key={item}>
          <a
            href={`${hrefPrefix}${item}`}
            className="text-emerald-300 underline underline-offset-2"
          >
            {item}
          </a>
          {index < items.length - 1 ? ", " : ""}
        </span>
      ))}
    </p>
  );
}

function ExternalLinks({ items }: { items: CandidateLinkItem[] }): ReactElement {
  if (items.length === 0) {
    return <p className="text-xs text-neutral-500">No external profiles</p>;
  }

  return (
    <ul className="space-y-1 text-xs">
      {items.map((item) => (
        <li key={`${item.label}-${item.url}`}>
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="text-emerald-300 underline underline-offset-2"
          >
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

function formatExperienceLabel(totalMonths: number): string {
  if (totalMonths < 12) {
    return `${totalMonths} months total experience`;
  }

  const years = totalMonths / 12;
  const roundedYears = years >= 10 ? years.toFixed(0) : years.toFixed(1);
  return `${roundedYears} years total experience`;
}
