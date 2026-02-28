"use client";

import { FormEvent, useMemo, useState } from "react";

type RunStatus = "idle" | "running" | "success" | "error";
type AgentId = "linkedin" | "twitter";

type AgentDefinition = {
  id: AgentId;
  title: string;
  subtitle: string;
};

const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    id: "linkedin",
    title: "LinkedIn Agent",
    subtitle: "Profile posts, experience, and projects",
  },
  {
    id: "twitter",
    title: "Twitter/X Agent",
    subtitle: "Top posts, replies, and interactions",
  },
];

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

const toStatusLabel = (status: RunStatus): string => {
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
};

const downloadMarkdown = (markdown: string, fileName: string) => {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

const buildLinkedinFileName = (profileUrl: string | null): string => {
  if (!profileUrl) {
    return "linkedin-output.md";
  }

  const username = profileUrl.split("/in/")[1]?.split("/")[0];

  if (!username || username.trim() === "") {
    return "linkedin-output.md";
  }

  return `${username}-linkedin.md`;
};

const parseTwitterProfileUrls = (profileUrlsInput: string | null): string[] => {
  if (!profileUrlsInput) {
    return [];
  }

  return profileUrlsInput
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter((line) => line !== "");
};

const buildTwitterFileName = (profileUrls: string[]): string => {
  if (profileUrls.length === 0) {
    return "twitter-output.md";
  }

  const firstProfile = profileUrls[0];
  const handle = firstProfile.replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//, "").split("/")[0];

  if (!handle || handle.trim() === "") {
    return "twitter-output.md";
  }

  return `${handle}-twitter.md`;
};

export default function DevToolsPage() {
  const [selectedAgent, setSelectedAgent] = useState<AgentId>("linkedin");

  const [linkedinProfileUrl, setLinkedinProfileUrl] = useState<string | null>("");
  const [linkedinSessionId, setLinkedinSessionId] = useState<string | null>("");
  const [linkedinMaxSteps, setLinkedinMaxSteps] = useState<string | null>("80");
  const [linkedinStatus, setLinkedinStatus] = useState<RunStatus>("idle");
  const [linkedinError, setLinkedinError] = useState<string | null>(null);
  const [linkedinMarkdownOutput, setLinkedinMarkdownOutput] = useState<string | null>(null);

  const [twitterProfileUrlsInput, setTwitterProfileUrlsInput] = useState<string | null>("");
  const [twitterSessionId, setTwitterSessionId] = useState<string | null>("");
  const [twitterMaxSteps, setTwitterMaxSteps] = useState<string | null>("120");
  const [twitterStatus, setTwitterStatus] = useState<RunStatus>("idle");
  const [twitterError, setTwitterError] = useState<string | null>(null);
  const [twitterMarkdownOutput, setTwitterMarkdownOutput] = useState<string | null>(null);

  const linkedinIsRunning = linkedinStatus === "running";
  const twitterIsRunning = twitterStatus === "running";
  const linkedinHasOutput = Boolean(linkedinMarkdownOutput && linkedinMarkdownOutput.trim() !== "");
  const twitterHasOutput = Boolean(twitterMarkdownOutput && twitterMarkdownOutput.trim() !== "");

  const linkedinStatusLabel = useMemo(() => toStatusLabel(linkedinStatus), [linkedinStatus]);
  const twitterStatusLabel = useMemo(() => toStatusLabel(twitterStatus), [twitterStatus]);

  const handleRunLinkedin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLinkedinStatus("running");
    setLinkedinError(null);
    setLinkedinMarkdownOutput(null);

    try {
      const body = {
        profileUrl: linkedinProfileUrl ?? "",
        sessionId:
          linkedinSessionId && linkedinSessionId.trim() !== "" ? linkedinSessionId : undefined,
        maxSteps: toPositiveIntegerOrUndefined(linkedinMaxSteps),
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
        setLinkedinStatus("error");
        setLinkedinError(message);
        return;
      }

      setLinkedinStatus("success");
      setLinkedinMarkdownOutput(json.markdown);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      setLinkedinStatus("error");
      setLinkedinError(message);
    }
  };

  const handleRunTwitter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTwitterStatus("running");
    setTwitterError(null);
    setTwitterMarkdownOutput(null);

    const profileUrls = parseTwitterProfileUrls(twitterProfileUrlsInput);

    if (profileUrls.length === 0) {
      setTwitterStatus("error");
      setTwitterError("Add at least one X/Twitter profile URL.");
      return;
    }

    try {
      const body = {
        profileUrls,
        sessionId: twitterSessionId && twitterSessionId.trim() !== "" ? twitterSessionId : undefined,
        maxSteps: toPositiveIntegerOrUndefined(twitterMaxSteps),
      };

      const response = await fetch("/api/agents/twitter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const json = (await response.json()) as { markdown?: string; error?: string };

      if (!response.ok || !json.markdown) {
        const message = json.error ?? "Failed to run Twitter_agent.";
        setTwitterStatus("error");
        setTwitterError(message);
        return;
      }

      setTwitterStatus("success");
      setTwitterMarkdownOutput(json.markdown);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      setTwitterStatus("error");
      setTwitterError(message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 lg:flex-row">
        <aside className="h-fit rounded-2xl border border-slate-800 bg-slate-900/70 p-4 lg:w-80">
          <h1 className="text-xl font-semibold tracking-tight">Dev Tools</h1>
          <p className="mt-2 text-sm text-slate-300">
            Pick an agent from the sidebar and run it from this page.
          </p>
          <p className="mt-2 text-xs text-amber-300">
            Required env var: <code>BROWSER_USE_API_KEY</code> in <code>.env.local</code>
          </p>

          <nav className="mt-4 flex flex-col gap-2">
            {AGENT_DEFINITIONS.map((agent) => {
              const isSelected = selectedAgent === agent.id;

              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => setSelectedAgent(agent.id)}
                  className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                    isSelected
                      ? "border-cyan-300 bg-cyan-300/10 text-cyan-100"
                      : "border-slate-700 bg-slate-950 text-slate-200 hover:border-slate-500"
                  }`}
                >
                  <div className="text-sm font-semibold">{agent.title}</div>
                  <div className="mt-1 text-xs text-slate-300">{agent.subtitle}</div>
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="flex-1">
          {selectedAgent === "linkedin" ? (
            <div className="flex flex-col gap-6">
              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <h2 className="text-2xl font-semibold tracking-tight">LinkedIn Agent</h2>
                <p className="mt-2 text-sm text-slate-300">
                  Scrapes profile posts, experience, and projects into markdown.
                </p>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <form className="flex flex-col gap-4" onSubmit={handleRunLinkedin}>
                  <label className="flex flex-col gap-2 text-sm">
                    LinkedIn Profile URL
                    <input
                      type="url"
                      value={linkedinProfileUrl ?? ""}
                      onChange={(event) => setLinkedinProfileUrl(event.target.value)}
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
                        value={linkedinSessionId ?? ""}
                        onChange={(event) => setLinkedinSessionId(event.target.value)}
                        placeholder="reuse Browser Use session id"
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-cyan-400/40 focus:ring-2"
                      />
                    </label>

                    <label className="flex flex-col gap-2 text-sm">
                      Max Steps (optional)
                      <input
                        type="number"
                        min={1}
                        value={linkedinMaxSteps ?? ""}
                        onChange={(event) => setLinkedinMaxSteps(event.target.value)}
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-cyan-400/40 focus:ring-2"
                      />
                    </label>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="submit"
                      disabled={linkedinIsRunning}
                      className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                    >
                      {linkedinIsRunning ? "Running..." : "Run Linkedin_agent"}
                    </button>

                    <span className="text-sm text-slate-300">Status: {linkedinStatusLabel}</span>
                  </div>
                </form>

                {linkedinError ? (
                  <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                    {linkedinError}
                  </div>
                ) : null}
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">Markdown Output</h3>
                  <button
                    type="button"
                    onClick={() =>
                      linkedinMarkdownOutput
                        ? downloadMarkdown(
                            linkedinMarkdownOutput,
                            buildLinkedinFileName(linkedinProfileUrl),
                          )
                        : null
                    }
                    disabled={!linkedinHasOutput}
                    className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:border-cyan-300 hover:text-cyan-200 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500"
                  >
                    Download .md
                  </button>
                </div>

                <pre className="min-h-64 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                  {linkedinMarkdownOutput ?? "No output yet. Run the agent to generate markdown."}
                </pre>
              </section>
            </div>
          ) : null}

          {selectedAgent === "twitter" ? (
            <div className="flex flex-col gap-6">
              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <h2 className="text-2xl font-semibold tracking-tight">Twitter/X Agent</h2>
                <p className="mt-2 text-sm text-slate-300">
                  Scrapes top posts, replies, comments, and interactions into markdown.
                </p>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <form className="flex flex-col gap-4" onSubmit={handleRunTwitter}>
                  <label className="flex flex-col gap-2 text-sm">
                    X/Twitter Profile URLs (one per line)
                    <textarea
                      value={twitterProfileUrlsInput ?? ""}
                      onChange={(event) => setTwitterProfileUrlsInput(event.target.value)}
                      placeholder={"https://x.com/user_one\nhttps://x.com/user_two"}
                      required
                      rows={5}
                      className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-cyan-400/40 focus:ring-2"
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm">
                      Session ID (optional)
                      <input
                        type="text"
                        value={twitterSessionId ?? ""}
                        onChange={(event) => setTwitterSessionId(event.target.value)}
                        placeholder="reuse Browser Use session id"
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-cyan-400/40 focus:ring-2"
                      />
                    </label>

                    <label className="flex flex-col gap-2 text-sm">
                      Max Steps (optional)
                      <input
                        type="number"
                        min={1}
                        value={twitterMaxSteps ?? ""}
                        onChange={(event) => setTwitterMaxSteps(event.target.value)}
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-cyan-400/40 focus:ring-2"
                      />
                    </label>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="submit"
                      disabled={twitterIsRunning}
                      className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                    >
                      {twitterIsRunning ? "Running..." : "Run Twitter_agent"}
                    </button>

                    <span className="text-sm text-slate-300">Status: {twitterStatusLabel}</span>
                  </div>
                </form>

                {twitterError ? (
                  <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                    {twitterError}
                  </div>
                ) : null}
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">Markdown Output</h3>
                  <button
                    type="button"
                    onClick={() => {
                      if (!twitterMarkdownOutput) {
                        return;
                      }

                      const twitterProfileUrls = parseTwitterProfileUrls(twitterProfileUrlsInput);
                      downloadMarkdown(
                        twitterMarkdownOutput,
                        buildTwitterFileName(twitterProfileUrls),
                      );
                    }}
                    disabled={!twitterHasOutput}
                    className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:border-cyan-300 hover:text-cyan-200 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500"
                  >
                    Download .md
                  </button>
                </div>

                <pre className="min-h-64 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                  {twitterMarkdownOutput ?? "No output yet. Run the agent to generate markdown."}
                </pre>
              </section>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
