"use client";

import Link from "next/link";
import { useMemo, type ReactElement } from "react";
import { ConvexProvider, ConvexReactClient, useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  WORKFLOW_AGENT_LABELS,
  type WorkflowAgentType,
} from "@/lib/workflows/constants";

type ActiveLiveRun = {
  _id: string;
  agentType: WorkflowAgentType;
  liveUrl: string;
  candidateName: string | null;
  sourceCandidateId: string | null;
};

type OmniTile = {
  id: string;
  agentType: WorkflowAgentType;
  title: string;
  isLive: boolean;
  liveUrl: string | null;
  candidateName: string | null;
  sourceCandidateId: string | null;
};

const TOTAL_CELLS = 18;

const SURROUNDING_AGENTS: WorkflowAgentType[] = [
  "linkedin",
  "github",
  "linkedin_posts",
  "devpost",
  "linkedin",
  "github",
  "devpost",
  "linkedin_posts",
  "linkedin",
  "github",
  "devpost",
  "linkedin_posts",
  "linkedin",
  "github",
  "devpost",
  "github",
  "linkedin_posts",
];

function toTileTitle(agentType: WorkflowAgentType): string {
  if (agentType === "linkedin_posts") {
    return "LinkedIn Posts Agent";
  }

  return `${WORKFLOW_AGENT_LABELS[agentType]} Agent`;
}

function normalizeLiveRuns(runs: ActiveLiveRun[] | undefined): ActiveLiveRun[] {
  if (!runs) {
    return [];
  }

  return runs
    .filter(
      (run): run is ActiveLiveRun =>
        typeof run.liveUrl === "string" && run.liveUrl.trim().length > 0,
    )
    .map((run) => ({
      _id: run._id,
      agentType: run.agentType,
      liveUrl: run.liveUrl.trim(),
      candidateName: run.candidateName ?? null,
      sourceCandidateId: run.sourceCandidateId ?? null,
    }));
}

function buildOmniTiles(activeRuns: ActiveLiveRun[]): {
  tiles: OmniTile[];
  overflowCount: number;
} {
  const remainingRuns = [...activeRuns];

  // Juicebox is always first cell
  const juiceboxRunIndex = remainingRuns.findIndex(
    (run) => run.agentType === "juicebox",
  );
  let juiceboxRun: ActiveLiveRun | null = null;
  if (juiceboxRunIndex >= 0) {
    const selected = remainingRuns.splice(juiceboxRunIndex, 1)[0];
    juiceboxRun = selected ?? null;
  }

  const allAgents: WorkflowAgentType[] = ["juicebox", ...SURROUNDING_AGENTS];
  const tiles: OmniTile[] = [];

  for (let i = 0; i < TOTAL_CELLS; i++) {
    const mockAgentType = allAgents[i];

    if (i === 0) {
      // Juicebox cell
      tiles.push({
        id: `cell-${i}`,
        agentType: juiceboxRun?.agentType ?? mockAgentType,
        title: toTileTitle(juiceboxRun?.agentType ?? mockAgentType),
        isLive: Boolean(juiceboxRun),
        liveUrl: juiceboxRun?.liveUrl ?? null,
        candidateName: juiceboxRun?.candidateName ?? null,
        sourceCandidateId: juiceboxRun?.sourceCandidateId ?? null,
      });
    } else {
      const run = remainingRuns.shift() ?? null;
      tiles.push({
        id: `cell-${i}`,
        agentType: run?.agentType ?? mockAgentType,
        title: toTileTitle(run?.agentType ?? mockAgentType),
        isLive: Boolean(run),
        liveUrl: run?.liveUrl ?? null,
        candidateName: run?.candidateName ?? null,
        sourceCandidateId: run?.sourceCandidateId ?? null,
      });
    }
  }

  return {
    tiles,
    overflowCount: remainingRuns.length,
  };
}

function ErrorState({ title, message }: { title: string; message: string }) {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-red-500/40 bg-red-500/10 p-6">
        <h1 className="text-lg font-semibold text-red-200">{title}</h1>
        <p className="mt-2 text-sm text-red-300">{message}</p>
      </div>
    </main>
  );
}

function statusBadgeClasses(status: string): string {
  if (status === "running") {
    return "border-emerald-500/40 bg-emerald-500/15 text-emerald-200";
  }

  if (status === "completed") {
    return "border-cyan-500/40 bg-cyan-500/15 text-cyan-200";
  }

  return "border-red-500/40 bg-red-500/15 text-red-200";
}

function WorkflowOmniDashboard({ workflowId }: { workflowId: string }) {
  const workflowsQuery = useQuery(api.workflows.listWorkflows, {});
  const workflows = useMemo(() => workflowsQuery ?? [], [workflowsQuery]);
  const isWorkflowListLoading = workflowsQuery === undefined;

  const validatedWorkflowId = useMemo<Id<"workflows"> | null>(() => {
    const matched = workflows.find((workflow) => workflow._id === workflowId);
    return matched?._id ?? null;
  }, [workflowId, workflows]);

  const invalidWorkflow = !isWorkflowListLoading && validatedWorkflowId === null;

  const workflowQuery = useQuery(
    api.workflows.getWorkflow,
    validatedWorkflowId ? { workflowId: validatedWorkflowId } : "skip",
  );

  const activeRunsQuery = useQuery(
    api.workflows.listActiveLiveRuns,
    validatedWorkflowId ? { workflowId: validatedWorkflowId } : "skip",
  );

  const isWorkflowDetailsLoading =
    validatedWorkflowId !== null &&
    (workflowQuery === undefined || activeRunsQuery === undefined);

  const isLoading = isWorkflowListLoading || isWorkflowDetailsLoading;

  const workflow = workflowQuery ?? null;
  const missingWorkflow =
    !isWorkflowListLoading && validatedWorkflowId !== null && workflowQuery === null;

  const activeRuns = useMemo<ActiveLiveRun[]>(() => {
    const runs = activeRunsQuery ?? [];

    return normalizeLiveRuns(
      runs.map((run) => ({
        _id: run._id,
        agentType: run.agentType,
        liveUrl: run.liveUrl ?? "",
        candidateName: run.candidateName ?? null,
        sourceCandidateId: run.sourceCandidateId ?? null,
      })),
    );
  }, [activeRunsQuery]);

  const tilesData = useMemo(() => buildOmniTiles(activeRuns), [activeRuns]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050a17] px-4 text-slate-300">
        <p className="text-sm">Loading command center sessions...</p>
      </main>
    );
  }

  if (invalidWorkflow) {
    return (
      <ErrorState
        title="Workflow not found"
        message={`No workflow exists for id "${workflowId}".`}
      />
    );
  }

  if (missingWorkflow || workflow === null) {
    return (
      <ErrorState
        title="Workflow unavailable"
        message="The workflow could not be loaded. It may have been removed."
      />
    );
  }

  return (
    <main className="min-h-screen w-full bg-black p-2 text-slate-100 md:p-3 flex flex-col font-sans">
      <div className="mb-2 flex items-center justify-between px-2 text-slate-400">
        <div className="flex items-center gap-4">
          <Link
            href={`/demo/results/${workflowId}`}
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors bg-slate-900/50 border border-slate-700 hover:border-slate-500 rounded px-3 py-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            Back to Results
          </Link>
          <h1 className="text-lg font-bold tracking-widest text-white uppercase flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-cyan-400"
            >
              <path d="M2 12h4l2-9 5 18 3-9h6" />
            </svg>
            Workflow Omni View
          </h1>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span
            className={`rounded border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${statusBadgeClasses(
              workflow.status,
            )}`}
          >
            Workflow: {workflow.status}
          </span>
          <span className="flex items-center gap-1">
            <span
              className={`h-2 w-2 rounded-full ${
                workflow.status === "running" ? "animate-pulse bg-green-500" : "bg-slate-500"
              }`}
            />
            {workflow.status === "running" ? "SYSTEM ONLINE" : "SYSTEM IDLE"}
          </span>
          <span className="flex items-center gap-2">
            <span>ACTIVE SESSIONS: {activeRuns.length}</span>
            {tilesData.overflowCount > 0 ? (
              <span className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-300">
                +{tilesData.overflowCount} more
              </span>
            ) : null}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-0 auto-rows-[300px]">
        {tilesData.tiles.map((tile) => {
          const isJuicebox = tile.agentType === "juicebox";

          return (
            <div key={tile.id} className="w-full h-full">
              <div className="flex w-full h-full flex-col relative group overflow-hidden bg-[#020510]">
                {/* Title badge in top-left */}
                <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      tile.isLive
                        ? "animate-pulse bg-green-500"
                        : isJuicebox
                          ? "bg-green-500"
                          : "bg-cyan-500"
                    }`}
                  />
                  <span className="text-xs font-semibold text-slate-300">
                    {tile.title}
                  </span>
                </div>

                {/* Live iframe or waiting placeholder */}
                {tile.isLive && tile.liveUrl ? (
                  <div className="flex-1 overflow-hidden mt-8 relative">
                    <iframe
                      src={tile.liveUrl}
                      title={`${tile.agentType}-${tile.id}`}
                      className="absolute border-0"
                      style={{
                        top: "-140px",
                        left: 0,
                        width: "100%",
                        height: "calc(100% + 140px)",
                      }}
                      allow="clipboard-read; clipboard-write"
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center p-8">
                    <span className="text-xs text-slate-600 font-mono">
                      Waiting for live stream...
                    </span>
                  </div>
                )}

                {/* Juicebox init text when not live */}
                {isJuicebox && !tile.isLive ? (
                  <div className="absolute bottom-0 left-0 right-0 p-4 pb-3 flex flex-col justify-end text-[11px] text-green-400 font-mono">
                    <div>&gt; Init juicebox candidate search...</div>
                    <div className="animate-pulse">&gt; Monitoring workflow run_</div>
                  </div>
                ) : null}

                {/* Live badge for juicebox */}
                {isJuicebox && tile.isLive ? (
                  <div className="pointer-events-none absolute right-2 top-8 rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                    Live
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

export default function DemoWorkflowOmniPage(): ReactElement {
  const params = useParams<{ workflowId?: string }>();
  const workflowId = typeof params.workflowId === "string" ? params.workflowId : null;
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  const convexClient = useMemo(
    () => (convexUrl ? new ConvexReactClient(convexUrl) : null),
    [convexUrl],
  );

  if (!convexUrl || !convexClient) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6">
        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">
          Missing NEXT_PUBLIC_CONVEX_URL. Add it to your environment before using
          workflow omni view.
        </div>
      </main>
    );
  }

  if (!workflowId) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6">
        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">
          Missing workflow id in route.
        </div>
      </main>
    );
  }

  return (
    <ConvexProvider client={convexClient}>
      <WorkflowOmniDashboard workflowId={workflowId} />
    </ConvexProvider>
  );
}
