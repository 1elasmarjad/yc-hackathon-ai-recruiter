"use client";

import { FormEvent, useMemo, useState } from "react";

type RunStatus = "idle" | "running" | "success" | "error";

const toPositiveIntegerOrUndefined = (value: string | null): number | undefined => {
  if (!value || value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
};

const buildFileName = (profileUrl: string | null): string => {
  if (!profileUrl) {
    return "linkedin-output.md";
  }

  const username = profileUrl.split("/in/")[1]?.split("/")[0];

  if (!username || username.trim() === "") {
    return "linkedin-output.md";
  }

  return `${username}-linkedin.md`;
};

export default function Home() {
  const [profileUrl, setProfileUrl] = useState<string | null>("");
  const [sessionId, setSessionId] = useState<string | null>("");
  const [maxSteps, setMaxSteps] = useState<string | null>("80");
  const [status, setStatus] = useState<RunStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [markdownOutput, setMarkdownOutput] = useState<string | null>(null);

  const isRunning = status === "running";
  const hasOutput = Boolean(markdownOutput && markdownOutput.trim() !== "");

  const statusLabel = useMemo(() => {
    if (status === "running") {
      return "Running agent...";
    }

    if (status === "success") {
      return "Done";
    }

    if (status === "error") {
      return "Error";
    }

    return "Ready";
  }, [status]);

  const handleRun = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("running");
    setErrorMessage(null);
    setMarkdownOutput(null);

    try {
      const body = {
        profileUrl: profileUrl ?? "",
        sessionId: sessionId && sessionId.trim() !== "" ? sessionId : undefined,
        maxSteps: toPositiveIntegerOrUndefined(maxSteps),
      };

      const response = await fetch("/api/agents/linkedin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const json = (await response.json()) as { markdown?: string; error?: string };

      if (!response.ok || !json.markdown) {
        const message = json.error ?? "Failed to run Linkedin_agent.";
        setStatus("error");
        setErrorMessage(message);
        return;
      }

      setStatus("success");
      setMarkdownOutput(json.markdown);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      setStatus("error");
      setErrorMessage(message);
    }
  };

  const handleDownloadMarkdown = () => {
    if (!markdownOutput) {
      return;
    }

    const blob = new Blob([markdownOutput], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = buildFileName(profileUrl);
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h1 className="text-2xl font-semibold tracking-tight">LinkedIn Agent Dev Test</h1>
          <p className="mt-2 text-sm text-slate-300">
            Use this page to run <code>Linkedin_agent</code> and get a markdown (.md) report.
          </p>
          <p className="mt-2 text-xs text-amber-300">
            Required env var: <code>BROWSER_USE_API_KEY</code> in <code>.env.local</code>
          </p>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <form className="flex flex-col gap-4" onSubmit={handleRun}>
            <label className="flex flex-col gap-2 text-sm">
              LinkedIn Profile URL
              <input
                type="url"
                value={profileUrl ?? ""}
                onChange={(event) => setProfileUrl(event.target.value)}
                placeholder="https://www.linkedin.com/in/username/"
                required
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-cyan-400/40 focus:ring-2"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm">
                Session ID (optional)
                <input
                  type="text"
                  value={sessionId ?? ""}
                  onChange={(event) => setSessionId(event.target.value)}
                  placeholder="reuse Browser Use session id"
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-cyan-400/40 focus:ring-2"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                Max Steps (optional)
                <input
                  type="number"
                  min={1}
                  value={maxSteps ?? ""}
                  onChange={(event) => setMaxSteps(event.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-cyan-400/40 focus:ring-2"
                />
              </label>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isRunning}
                className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
              >
                {isRunning ? "Running..." : "Run Linkedin_agent"}
              </button>

              <span className="text-sm text-slate-300">Status: {statusLabel}</span>
            </div>
          </form>

          {errorMessage ? (
            <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              {errorMessage}
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Markdown Output</h2>
            <button
              type="button"
              onClick={handleDownloadMarkdown}
              disabled={!hasOutput}
              className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:border-cyan-300 hover:text-cyan-200 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500"
            >
              Download .md
            </button>
          </div>

          <pre className="min-h-64 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-4 text-xs leading-6 text-slate-100">
            {markdownOutput ?? "No output yet. Run the agent to generate markdown."}
          </pre>
        </section>
      </main>
    </div>
  );
}
