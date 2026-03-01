"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
} from "react";
import { ConvexProvider, ConvexReactClient, useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import {
  WORKFLOW_AGENT_FILTER_VALUES,
  WORKFLOW_AGENT_LABELS,
  type WorkflowAgentFilter,
} from "@/lib/workflows/constants";
import { WorkflowStartResponseSchema } from "@/lib/workflows/schemas";

function formatDateTime(timestamp: number | undefined): string {
  if (typeof timestamp !== "number") {
    return "-";
  }

  return new Date(timestamp).toLocaleString();
}

function statusClasses(status: "running" | "completed" | "failed"): string {
  if (status === "running") {
    return "border-emerald-500/40 bg-emerald-500/15 text-emerald-200";
  }

  if (status === "completed") {
    return "border-cyan-500/40 bg-cyan-500/15 text-cyan-200";
  }

  return "border-red-500/40 bg-red-500/15 text-red-200";
}

function WorkflowsDashboard(): ReactElement {
  const [targetUrl, setTargetUrl] = useState<string | null>("");
  const [totalPages, setTotalPages] = useState<string | null>("1");
  const [workflowName, setWorkflowName] = useState<string | null>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<Id<"workflows"> | null>(null);
  const [agentFilter, setAgentFilter] = useState<WorkflowAgentFilter>("all");

  const workflowsQuery = useQuery(api.workflows.listWorkflows, {});
  const workflows = useMemo(() => workflowsQuery ?? [], [workflowsQuery]);

  useEffect(() => {
    if (workflows.length === 0) {
      if (selectedWorkflowId !== null) {
        setSelectedWorkflowId(null);
      }
      return;
    }

    const selectedIsValid = selectedWorkflowId
      ? workflows.some((workflow) => workflow._id === selectedWorkflowId)
      : false;

    if (!selectedIsValid) {
      setSelectedWorkflowId(workflows[0]._id);
    }
  }, [selectedWorkflowId, workflows]);

  const selectedWorkflow = useQuery(
    api.workflows.getWorkflow,
    selectedWorkflowId ? { workflowId: selectedWorkflowId } : "skip",
  );

  const selectedWorkflowCandidatesQuery = useQuery(
    api.workflows.listCandidatesByWorkflow,
    selectedWorkflowId ? { workflowId: selectedWorkflowId } : "skip",
  );

  const selectedWorkflowCandidates = useMemo(
    () => selectedWorkflowCandidatesQuery ?? [],
    [selectedWorkflowCandidatesQuery],
  );

  const selectedWorkflowActiveRunsQuery = useQuery(
    api.workflows.listActiveLiveRuns,
    selectedWorkflowId
      ? {
          workflowId: selectedWorkflowId,
          agentType: agentFilter === "all" ? undefined : agentFilter,
        }
      : "skip",
  );

  const selectedWorkflowActiveRuns = useMemo(
    () => selectedWorkflowActiveRunsQuery ?? [],
    [selectedWorkflowActiveRunsQuery],
  );

  const selectedWorkflowRunHistoryQuery = useQuery(
    api.workflows.listRunHistory,
    selectedWorkflowId
      ? {
          workflowId: selectedWorkflowId,
          agentType: agentFilter === "all" ? undefined : agentFilter,
        }
      : "skip",
  );

  const selectedWorkflowRunHistory = useMemo(
    () => selectedWorkflowRunHistoryQuery ?? [],
    [selectedWorkflowRunHistoryQuery],
  );

  const candidateStatusSummary = useMemo(
    () => ({
      pending: selectedWorkflowCandidates.filter((candidate) => candidate.status === "pending")
        .length,
      running: selectedWorkflowCandidates.filter((candidate) => candidate.status === "running")
        .length,
      completed: selectedWorkflowCandidates.filter(
        (candidate) => candidate.status === "completed",
      ).length,
      failed: selectedWorkflowCandidates.filter((candidate) => candidate.status === "failed")
        .length,
    }),
    [selectedWorkflowCandidates],
  );

  async function handleStartWorkflow(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

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
          name: workflowName?.trim() ? workflowName.trim() : undefined,
        }),
      });

      const responseJson = (await response.json()) as { error?: string; workflowId?: string };

      if (!response.ok) {
        throw new Error(responseJson.error ?? "Failed to start workflow.");
      }

      const parsedResponse = WorkflowStartResponseSchema.safeParse(responseJson);
      if (!parsedResponse.success) {
        throw new Error("Workflow start response was invalid.");
      }

      setSelectedWorkflowId(parsedResponse.data.workflowId as Id<"workflows">);
      setTargetUrl("");
      setTotalPages("1");
      setWorkflowName("");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to start workflow.";
      setSubmissionError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Workflow Dashboard</h1>
              <p className="mt-2 text-sm text-slate-300">
                Start Juicebox workflows and monitor live URLs from each running agent.
              </p>
            </div>
            <Link
              href="/admin"
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-300 hover:text-cyan-200"
            >
              Open Agent Dev Tools
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-lg font-semibold">Start Workflow</h2>
          <form className="mt-4 grid gap-4 lg:grid-cols-4" onSubmit={handleStartWorkflow}>
            <label className="flex flex-col gap-2 text-sm lg:col-span-2">
              Target URL
              <input
                type="url"
                required
                value={targetUrl ?? ""}
                onChange={(event) => setTargetUrl(event.target.value)}
                placeholder="https://app.juicebox.work/..."
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-cyan-400/40 focus:ring-2"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm">
              Total Pages
              <input
                type="number"
                min={1}
                step={1}
                required
                value={totalPages ?? ""}
                onChange={(event) => setTotalPages(event.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-cyan-400/40 focus:ring-2"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm">
              Name (optional)
              <input
                type="text"
                value={workflowName ?? ""}
                onChange={(event) => setWorkflowName(event.target.value)}
                placeholder="Hiring Sprint - AI Engineers"
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-cyan-400/40 focus:ring-2"
              />
            </label>

            <div className="lg:col-span-4 flex items-center gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
              >
                {isSubmitting ? "Starting..." : "Start Workflow"}
              </button>
            </div>
          </form>

          {submissionError ? (
            <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {submissionError}
            </p>
          ) : null}
        </section>

        <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <h2 className="text-base font-semibold">Workflows</h2>
            <div className="mt-3 max-h-[520px] space-y-2 overflow-auto pr-1">
              {workflows.length === 0 ? (
                <p className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-400">
                  No workflows yet.
                </p>
              ) : (
                workflows.map((workflow) => {
                  const isSelected = selectedWorkflowId === workflow._id;

                  return (
                    <button
                      key={workflow._id}
                      type="button"
                      onClick={() => setSelectedWorkflowId(workflow._id)}
                      className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                        isSelected
                          ? "border-cyan-300 bg-cyan-300/10"
                          : "border-slate-700 bg-slate-950 hover:border-slate-500"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{workflow.name}</p>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClasses(
                            workflow.status,
                          )}`}
                        >
                          {workflow.status}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-400">{workflow.targetUrl}</p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Started: {formatDateTime(workflow.startedAt)}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Workflow Summary</h2>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  Agent Filter
                  <select
                    value={agentFilter}
                    onChange={(event) => setAgentFilter(event.target.value as WorkflowAgentFilter)}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm outline-none ring-cyan-400/40 focus:ring-2"
                  >
                    {WORKFLOW_AGENT_FILTER_VALUES.map((filterValue) => (
                      <option value={filterValue} key={filterValue}>
                        {filterValue === "all"
                          ? "All agents"
                          : WORKFLOW_AGENT_LABELS[filterValue]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {selectedWorkflow ? (
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <p className="text-xs text-slate-400">Status</p>
                    <p className="mt-1 font-semibold">{selectedWorkflow.status}</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <p className="text-xs text-slate-400">Candidates</p>
                    <p className="mt-1 font-semibold">{selectedWorkflow.totalCandidates}</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <p className="text-xs text-slate-400">Processed</p>
                    <p className="mt-1 font-semibold">{selectedWorkflow.processedCandidates}</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <p className="text-xs text-slate-400">Failed Candidates</p>
                    <p className="mt-1 font-semibold">{selectedWorkflow.failedCandidates}</p>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-400">Select a workflow to view details.</p>
              )}

              {selectedWorkflow ? (
                <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
                  <p>
                    Pending: {candidateStatusSummary.pending} | Running: {candidateStatusSummary.running} | Completed: {candidateStatusSummary.completed} | Failed: {candidateStatusSummary.failed}
                  </p>
                  {selectedWorkflow.error ? (
                    <p className="mt-2 text-red-300">Error: {selectedWorkflow.error}</p>
                  ) : null}
                </div>
              ) : null}
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <h2 className="text-lg font-semibold">Active Live URLs</h2>
              <p className="mt-2 text-xs text-slate-400">
                Only running agent runs with a live URL are shown here.
              </p>

              {selectedWorkflowActiveRuns.length === 0 ? (
                <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
                  No active live URLs for the selected workflow and filter.
                </div>
              ) : (
                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  {selectedWorkflowActiveRuns.map((run) => (
                    <article key={run._id} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">
                            {WORKFLOW_AGENT_LABELS[run.agentType]} {run.candidateName ? `- ${run.candidateName}` : ""}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {run.sourceCandidateId ?? "workflow-level"}
                          </p>
                        </div>
                        <a
                          href={run.liveUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-slate-700 px-2 py-1 text-xs font-semibold text-slate-200 transition hover:border-cyan-300 hover:text-cyan-200"
                        >
                          Open tab
                        </a>
                      </div>

                      <p className="mt-2 truncate text-[11px] text-cyan-300">{run.liveUrl}</p>

                      <iframe
                        src={run.liveUrl}
                        title={`${run.agentType}-${run._id}`}
                        className="mt-3 h-[420px] w-full rounded-lg border border-slate-800 bg-black"
                        allow="clipboard-read; clipboard-write"
                      />
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <h2 className="text-lg font-semibold">Run History</h2>
              <p className="mt-2 text-xs text-slate-400">
                Completed and failed runs for the selected workflow.
              </p>

              {selectedWorkflowRunHistory.length === 0 ? (
                <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
                  No completed or failed runs yet.
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[920px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400">
                        <th className="px-2 py-2">Agent</th>
                        <th className="px-2 py-2">Candidate</th>
                        <th className="px-2 py-2">Status</th>
                        <th className="px-2 py-2">Started</th>
                        <th className="px-2 py-2">Completed</th>
                        <th className="px-2 py-2">Target</th>
                        <th className="px-2 py-2">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedWorkflowRunHistory.map((run) => (
                        <tr key={run._id} className="border-b border-slate-900/70 align-top">
                          <td className="px-2 py-2">{WORKFLOW_AGENT_LABELS[run.agentType]}</td>
                          <td className="px-2 py-2">{run.candidateName ?? "-"}</td>
                          <td className="px-2 py-2">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClasses(
                                run.status,
                              )}`}
                            >
                              {run.status}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-xs text-slate-300">
                            {formatDateTime(run.startedAt)}
                          </td>
                          <td className="px-2 py-2 text-xs text-slate-300">
                            {formatDateTime(run.completedAt)}
                          </td>
                          <td className="max-w-[260px] truncate px-2 py-2 text-xs text-slate-300">
                            {run.targetUrl ?? "-"}
                          </td>
                          <td className="max-w-[280px] truncate px-2 py-2 text-xs text-red-300">
                            {run.error ?? "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function WorkflowsPage(): ReactElement {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  const convexClient = useMemo(
    () => (convexUrl ? new ConvexReactClient(convexUrl) : null),
    [convexUrl],
  );

  if (!convexUrl || !convexClient) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6">
        <div className="mx-auto w-full max-w-2xl rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">
          Missing NEXT_PUBLIC_CONVEX_URL. Add it to your environment before using the workflow dashboard.
        </div>
      </main>
    );
  }

  return (
    <ConvexProvider client={convexClient}>
      <WorkflowsDashboard />
    </ConvexProvider>
  );
}
