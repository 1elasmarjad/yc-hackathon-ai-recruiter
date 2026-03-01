"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, X, Link2 } from "lucide-react";
import { WorkflowStartResponseSchema } from "@/lib/workflows/schemas";
import { LandingBG } from "../components/LandingBG";
import { SearchBar } from "../components/SearchBar";

const DEFAULT_URL =
  "https://chat.juicebox.work/project/iJ3hlJYmNvzrk4rzJepd/search?search_id=5aP8TclaX7z7bm5qpEjd";
const DEFAULT_TOTAL_PAGES = "1";

export default function DemoPage() {
  const router = useRouter();

  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [targetUrl, setTargetUrl] = useState<string | null>(DEFAULT_URL);
  const [totalPages, setTotalPages] = useState<string | null>(DEFAULT_TOTAL_PAGES);
  const [prompt, setPrompt] = useState<string | null>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showSettings) {
      return;
    }

    const handler = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    };

    document.addEventListener("mousedown", handler);

    return () => document.removeEventListener("mousedown", handler);
  }, [showSettings]);

  useEffect(() => {
    if (showSettings) {
      urlInputRef.current?.focus();
    }
  }, [showSettings]);

  const hasCustomSettings =
    (targetUrl ?? "").trim() !== DEFAULT_URL ||
    (totalPages ?? "").trim() !== DEFAULT_TOTAL_PAGES;

  async function handleSubmit(nextPrompt: string): Promise<void> {
    setSubmissionError(null);

    const normalizedTargetUrl = targetUrl?.trim() ?? "";
    if (normalizedTargetUrl.length === 0) {
      setSubmissionError("Target URL is required.");
      return;
    }

    try {
      new URL(normalizedTargetUrl);
    } catch {
      setSubmissionError("Target URL must be a valid absolute URL.");
      return;
    }

    const parsedTotalPages = Number.parseInt(totalPages?.trim() ?? "", 10);
    if (!Number.isInteger(parsedTotalPages) || parsedTotalPages < 1) {
      setSubmissionError("Total pages must be a positive integer.");
      return;
    }

    const normalizedPrompt = nextPrompt.trim();
    if (normalizedPrompt.length === 0) {
      setSubmissionError("A prompt is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/workflows/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetUrl: normalizedTargetUrl,
          totalPages: parsedTotalPages,
          aiCriteria: normalizedPrompt,
        }),
      });

      const responseJson = (await response.json()) as {
        error?: string;
        workflowId?: string;
      };

      if (!response.ok) {
        throw new Error(responseJson.error ?? "Failed to start workflow.");
      }

      const parsedResponse = WorkflowStartResponseSchema.safeParse(responseJson);
      if (!parsedResponse.success) {
        throw new Error("Workflow start response was invalid.");
      }

      router.push(`/demo/results/${parsedResponse.data.workflowId}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to start workflow.";
      setSubmissionError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0A0A0A] font-display">
      <LandingBG />

      <div className="relative z-10 -mt-[100px] w-full max-w-3xl px-6">
        <div
          className="mb-10 animate-fade-up text-center"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="mb-4 text-xs font-medium uppercase tracking-widest text-[#FF6B2C]">
            AI-Native Talent Discovery
          </div>
          <h1 className="mb-3 text-4xl font-bold tracking-tight text-white md:text-5xl">
            Find anyone, anywhere.
          </h1>
          <p className="text-base text-zinc-500">Who is your ideal candidate?</p>
        </div>

        <div className="relative">
          <SearchBar
            value={prompt ?? ""}
            onChange={(nextValue) => setPrompt(nextValue)}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />

          <div
            className="absolute right-0 top-[72px] z-20 animate-fade-up"
            style={{ animationDelay: "0.5s" }}
          >
            <button
              onClick={() => setShowSettings(true)}
              className="group flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-800 bg-[#141414] px-4 py-2 transition-all duration-300 hover:border-[#FF6B2C]/40 hover:bg-[#1a1a1a]"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-500 transition-colors duration-300 group-hover:text-[#FF6B2C]" />
              <span className="text-xs text-zinc-400 transition-colors duration-300 group-hover:text-zinc-200">
                Advanced Settings
              </span>
              {hasCustomSettings ? <span className="h-2 w-2 rounded-full bg-[#FF6B2C]" /> : null}
            </button>
          </div>
        </div>

        {submissionError ? (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {submissionError}
          </div>
        ) : null}
      </div>

      {showSettings ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]">
          <div
            ref={modalRef}
            className="mx-4 w-full max-w-lg rounded-3xl border border-zinc-800 bg-[#111111] shadow-2xl shadow-black/50 animate-[scaleIn_200ms_ease-out]"
          >
            <div className="flex items-center justify-between px-7 pb-4 pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF6B2C]/10">
                  <Link2 className="h-4 w-4 text-[#FF6B2C]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-white">
                    Advanced Settings
                  </h2>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Configure the target URL and pagination
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="cursor-pointer rounded-xl p-2 transition-colors hover:bg-zinc-800"
              >
                <X className="h-4 w-4 text-zinc-500" />
              </button>
            </div>

            <div className="space-y-4 px-7 pb-6">
              <label className="block">
                <span className="mb-1.5 block text-sm text-zinc-400">Target URL</span>
                <input
                  ref={urlInputRef}
                  type="url"
                  value={targetUrl ?? ""}
                  onChange={(event) => setTargetUrl(event.target.value)}
                  placeholder="https://app.juicebox.work/..."
                  className="w-full rounded-xl border border-zinc-800 bg-[#1a1a1a] px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors duration-300 focus:border-[#FF6B2C]/40"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm text-zinc-400">Total Pages</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={totalPages ?? ""}
                  onChange={(event) => setTotalPages(event.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-[#1a1a1a] px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors duration-300 focus:border-[#FF6B2C]/40"
                />
              </label>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowSettings(false)}
                  className="cursor-pointer rounded-xl bg-[#FF6B2C] px-5 py-2 text-sm font-medium text-white shadow-lg shadow-[#FF6B2C]/20 transition-colors duration-300 hover:bg-[#FF8040]"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
