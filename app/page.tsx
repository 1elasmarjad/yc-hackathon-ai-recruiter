"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";

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
    <main className="min-h-screen bg-neutral-950 px-6 py-16 text-neutral-100">
      <div className="mx-auto max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-900/60 p-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          YC Hackathon AI Recruiter
        </h1>
        <p className="mt-3 text-sm text-neutral-300">
          Development crawler tools are available under:
        </p>
        <p className="mt-2">
          <Link
            href="/dev/crawl/core"
            className="text-emerald-300 underline underline-offset-2"
          >
            /dev/crawl/core
          </Link>
        </p>
      </div>
    </main>
  );
}
