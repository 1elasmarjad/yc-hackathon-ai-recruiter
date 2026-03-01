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

type GridSlot = {
  id: string;
  row: number;
  col: number;
  isCenter: boolean;
  mockAgentType: WorkflowAgentType;
};

type OmniTile = {
  id: string;
  agentType: WorkflowAgentType;
  title: string;
  isCenter: boolean;
  isLive: boolean;
  liveUrl: string | null;
  candidateName: string | null;
  sourceCandidateId: string | null;
};

const NON_CENTER_AGENT_PATTERN: WorkflowAgentType[] = [
  "linkedin",
  "github",
  "linkedin_posts",
  "devpost",
  "linkedin",
  "github",
  "github",
  "devpost",
  "linkedin_posts",
  "devpost",
  "linkedin",
  "github",
  "devpost",
  "linkedin_posts",
  "linkedin",
  "linkedin",
  "github",
  "linkedin_posts",
  "devpost",
  "github",
  "linkedin",
  "linkedin_posts",
  "devpost",
  "github",
];

function toTileTitle(agentType: WorkflowAgentType): string {
  if (agentType === "linkedin_posts") {
    return "LinkedIn Posts Agent";
  }

  return `${WORKFLOW_AGENT_LABELS[agentType]} Agent`;
}

function buildGridSlots(): GridSlot[] {
  const slots: GridSlot[] = [];
  let nonCenterIndex = 0;

  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 6; col += 1) {
      const inCenterBlock = (row === 1 || row === 2) && (col === 2 || col === 3);
      const isCenterAnchor = row === 1 && col === 2;

      if (inCenterBlock && !isCenterAnchor) {
        continue;
      }

      if (isCenterAnchor) {
        slots.push({
          id: `cell-${row}-${col}`,
          row,
          col,
          isCenter: true,
          mockAgentType: "juicebox",
        });
        continue;
      }

      const nextMockAgentType =
        NON_CENTER_AGENT_PATTERN[nonCenterIndex % NON_CENTER_AGENT_PATTERN.length];
      nonCenterIndex += 1;

      slots.push({
        id: `cell-${row}-${col}`,
        row,
        col,
        isCenter: false,
        mockAgentType: nextMockAgentType,
      });
    }
  }

  return slots;
}

const GRID_SLOTS = buildGridSlots();

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
  const centerSlot = GRID_SLOTS.find((slot) => slot.isCenter);
  if (!centerSlot) {
    throw new Error("Missing center slot for omni grid.");
  }

  const nonCenterSlots = GRID_SLOTS.filter((slot) => !slot.isCenter);
  const remainingRuns = [...activeRuns];
  const centerRunIndex = remainingRuns.findIndex(
    (run) => run.agentType === "juicebox",
  );

  let centerRun: ActiveLiveRun | null = null;
  if (centerRunIndex >= 0) {
    const selected = remainingRuns.splice(centerRunIndex, 1)[0];
    centerRun = selected ?? null;
  }

  const tiles: OmniTile[] = [
    {
      id: centerSlot.id,
      agentType: centerRun?.agentType ?? centerSlot.mockAgentType,
      title: toTileTitle(centerRun?.agentType ?? centerSlot.mockAgentType),
      isCenter: true,
      isLive: Boolean(centerRun),
      liveUrl: centerRun?.liveUrl ?? null,
      candidateName: centerRun?.candidateName ?? null,
      sourceCandidateId: centerRun?.sourceCandidateId ?? null,
    },
  ];

  for (const slot of nonCenterSlots) {
    const run = remainingRuns.shift() ?? null;

    tiles.push({
      id: slot.id,
      agentType: run?.agentType ?? slot.mockAgentType,
      title: toTileTitle(run?.agentType ?? slot.mockAgentType),
      isCenter: false,
      isLive: Boolean(run),
      liveUrl: run?.liveUrl ?? null,
      candidateName: run?.candidateName ?? null,
      sourceCandidateId: run?.sourceCandidateId ?? null,
    });
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
  const tilesById = useMemo(
    () => new Map(tilesData.tiles.map((tile) => [tile.id, tile])),
    [tilesData.tiles],
  );

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
        message={`No workflow exists for id \"${workflowId}\".`}
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
    <main className="min-h-screen w-full overflow-hidden bg-black p-2 text-slate-100 md:p-4">
      <div className="mb-2 flex items-center justify-between px-2">
        <h1 className="flex items-center gap-2 text-lg font-bold uppercase tracking-widest text-white">
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

        <div className="flex items-center gap-2">
          <span
            className={`rounded border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${statusBadgeClasses(
              workflow.status,
            )}`}
          >
            Workflow: {workflow.status}
          </span>
          <Link
            href={`/demo/results/${workflowId}`}
            className="rounded border border-slate-600/60 bg-slate-700/50 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:border-cyan-300 hover:text-cyan-200"
          >
            Back to Results
          </Link>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between px-2 text-xs font-mono text-slate-400">
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

      <div className="grid h-[calc(100vh-96px)] grid-cols-6 grid-rows-4 gap-2">
        {GRID_SLOTS.map((slot) => {
          const tile = tilesById.get(slot.id);
          if (!tile) {
            return null;
          }

          const containerClassName = slot.isCenter
            ? "col-span-2 row-span-2 overflow-hidden rounded-xl border border-green-500/40 bg-slate-900/80 shadow-[0_0_15px_rgba(34,197,94,0.15)] ring-1 ring-green-400/20"
            : "overflow-hidden rounded-lg border border-slate-800 bg-slate-900/60 transition-colors hover:border-cyan-500/50";

          const sourceLabel =
            tile.candidateName ?? tile.sourceCandidateId ?? (tile.isLive ? "workflow-level" : null);

          return (
            <article key={slot.id} className={containerClassName}>
              <div className="flex h-full w-full flex-col p-2">
                <div className="mb-2 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          tile.isLive
                            ? "animate-pulse bg-green-500"
                            : tile.agentType === "juicebox"
                              ? "bg-green-500/70"
                              : "bg-cyan-500"
                        }`}
                      />
                      <span className="truncate text-xs font-semibold text-slate-300">
                        {tile.title}
                      </span>
                    </div>
                    {sourceLabel ? (
                      <p className="truncate pl-4 text-[10px] text-slate-500">{sourceLabel}</p>
                    ) : null}
                  </div>

                  <span className="font-mono text-[10px] text-slate-500">
                    ID: {slot.id.replace("cell-", "")}
                  </span>
                </div>

                <div className="group relative flex flex-1 flex-col overflow-hidden rounded border border-slate-700 bg-slate-950">
                  <div className="flex h-6 items-center gap-1.5 border-b border-slate-700 bg-slate-800 px-2 opacity-70 transition-opacity group-hover:opacity-100">
                    <div className="h-2 w-2 rounded-full bg-red-500/50" />
                    <div className="h-2 w-2 rounded-full bg-yellow-500/50" />
                    <div className="h-2 w-2 rounded-full bg-green-500/50" />
                    {tile.isLive && tile.liveUrl ? (
                      <a
                        href={tile.liveUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-auto text-[10px] text-cyan-300 hover:text-cyan-200"
                      >
                        Open
                      </a>
                    ) : null}
                  </div>

                  {tile.isLive && tile.liveUrl ? (
                    <iframe
                      src={tile.liveUrl}
                      title={`${tile.agentType}-${tile.id}`}
                      className="h-full w-full border-0"
                      allow="clipboard-read; clipboard-write"
                    />
                  ) : (
                    <div className="flex flex-1 items-center justify-center px-3 text-center text-xs text-slate-600">
                      Waiting for live stream...
                    </div>
                  )}

                  {tile.isCenter && !tile.isLive ? (
                    <div className="absolute inset-0 flex flex-col justify-end border border-green-500/30 bg-slate-950/80 p-4 font-mono text-sm text-green-400">
                      <div>&gt; Init juicebox candidate search...</div>
                      <div className="animate-pulse">&gt; Monitoring workflow run_</div>
                    </div>
                  ) : null}

                  {tile.isCenter && tile.isLive ? (
                    <div className="pointer-events-none absolute right-2 top-8 rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                      Live
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
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
