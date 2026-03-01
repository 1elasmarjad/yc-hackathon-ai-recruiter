"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";

type RunStatus = "idle" | "running" | "success" | "error";

type AssessmentResponse = {
  isFit: boolean;
  evidence: string[];
};

type UploadedCandidateDoc = {
  fileName: string;
  content: string;
};

const ACCEPTED_FILE_TYPES =
  ".md,.txt,text/markdown,text/plain,application/octet-stream";

export default function AssessmentDevPage() {
  const [aiCriteria, setAiCriteria] = useState<string | null>("");
  const [candidateMarkdown, setCandidateMarkdown] = useState<string | null>("");
  const [uploadedDocs, setUploadedDocs] = useState<UploadedCandidateDoc[]>([]);
  const [status, setStatus] = useState<RunStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<AssessmentResponse | null>(null);

  const isRunning = status === "running";

  const combinedDocumentCount = useMemo<number>(() => {
    const manualCount = candidateMarkdown && candidateMarkdown.trim() !== "" ? 1 : 0;
    return manualCount + uploadedDocs.length;
  }, [candidateMarkdown, uploadedDocs]);

  const resultJson = useMemo<string | null>(() => {
    if (!result) {
      return null;
    }

    return JSON.stringify(result, null, 2);
  }, [result]);

  async function handleFilesSelected(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    setErrorMessage(null);
    const files = event.target.files;

    if (!files || files.length === 0) {
      setUploadedDocs([]);
      return;
    }

    try {
      const nextDocs: UploadedCandidateDoc[] = [];
      for (const file of Array.from(files)) {
        const content = await file.text();
        if (content.trim() === "") {
          continue;
        }

        nextDocs.push({
          fileName: file.name,
          content,
        });
      }

      setUploadedDocs(nextDocs);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not read uploaded file.";
      setErrorMessage(message);
      setUploadedDocs([]);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setStatus("running");
    setErrorMessage(null);
    setResult(null);

    const nextCriteria = aiCriteria?.trim() ?? "";
    if (nextCriteria === "") {
      setStatus("error");
      setErrorMessage("AI criteria is required.");
      return;
    }

    const docs: string[] = [];
    if (candidateMarkdown && candidateMarkdown.trim() !== "") {
      docs.push(candidateMarkdown.trim());
    }

    for (const doc of uploadedDocs) {
      if (doc.content.trim() !== "") {
        docs.push(doc.content);
      }
    }

    if (docs.length === 0) {
      setStatus("error");
      setErrorMessage("Provide candidate markdown in text input and/or upload at least one file.");
      return;
    }

    try {
      const response = await fetch("/api/assessment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          aiCriteria: nextCriteria,
          candidateMarkdown: docs,
        }),
      });

      const json = (await response.json()) as Partial<AssessmentResponse> & { error?: string };
      if (!response.ok) {
        throw new Error(json.error ?? "Assessment request failed.");
      }

      if (typeof json.isFit !== "boolean" || !Array.isArray(json.evidence)) {
        throw new Error("Assessment response was not valid JSON shape.");
      }

      setResult({
        isFit: json.isFit,
        evidence: json.evidence,
      });
      setStatus("success");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown assessment error.";
      setErrorMessage(message);
      setStatus("error");
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-6">
          <h1 className="text-xl font-semibold tracking-tight">
            Assessment Dev Route
          </h1>
          <p className="mt-2 text-sm text-neutral-300">
            Test candidate fit scoring against AI requirements. Assessment runs
            through Convex action <code>assessment.assessCandidateFit</code>.
          </p>
        </section>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-6">
          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">AI Requirement / Criteria</span>
              <textarea
                className="min-h-28 rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-neutral-500"
                value={aiCriteria ?? ""}
                onChange={(event) => setAiCriteria(event.target.value)}
                placeholder="Example: Must have production AI experience, LLM evaluation work, and strong TypeScript."
                required
              />
            </label>

            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">Candidate Markdown / Text (manual)</span>
              <textarea
                className="min-h-40 rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-neutral-500"
                value={candidateMarkdown ?? ""}
                onChange={(event) => setCandidateMarkdown(event.target.value)}
                placeholder="Paste one candidate markdown document here."
              />
            </label>

            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">Upload Candidate Files (.md / .txt)</span>
              <input
                className="rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-200 file:px-3 file:py-1.5 file:text-neutral-900"
                type="file"
                accept={ACCEPTED_FILE_TYPES}
                multiple
                onChange={handleFilesSelected}
              />
            </label>

            <div className="text-sm text-neutral-300">
              Documents to assess: {combinedDocumentCount}
            </div>

            {uploadedDocs.length > 0 ? (
              <ul className="flex flex-wrap gap-2 text-xs">
                {uploadedDocs.map((doc, index) => (
                  <li
                    className="rounded-full border border-neutral-700 px-3 py-1 text-neutral-200"
                    key={`${doc.fileName}-${index}`}
                  >
                    {doc.fileName}
                  </li>
                ))}
              </ul>
            ) : null}

            <button
              className="w-fit rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={isRunning}
            >
              {isRunning ? "Assessing..." : "Run Assessment"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-6">
          <div className="text-sm">
            Status:{" "}
            <span className="font-medium">
              {status === "idle" ? "Ready" : status === "running" ? "Running" : status === "success" ? "Done" : "Error"}
            </span>
          </div>

          {errorMessage ? (
            <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {errorMessage}
            </p>
          ) : null}

          {result ? (
            <div className="mt-4 space-y-3">
              <div
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  result.isFit
                    ? "bg-emerald-400/20 text-emerald-200"
                    : "bg-amber-400/20 text-amber-200"
                }`}
              >
                {result.isFit ? "Fit" : "Not Fit"}
              </div>

              <pre className="overflow-x-auto rounded-xl border border-neutral-700 bg-neutral-950 p-4 text-xs leading-relaxed text-neutral-200">
                {resultJson}
              </pre>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
