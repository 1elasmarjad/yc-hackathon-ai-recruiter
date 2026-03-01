"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ConvexProvider, ConvexReactClient, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  WORKFLOW_AGENT_LABELS,
  WORKFLOW_AGENT_TYPE_VALUES,
  type WorkflowAgentType,
} from "@/lib/workflows/constants";

interface GridCell {
  id: string;
  type: WorkflowAgentType;
  title: string;
  liveUrl: string | null;
}

const MAX_CONCURRENT_STREAMS = 20;

function normalizeLiveUrl(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return trimmed;
}

export default function CommandCenterPage() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  const convexClient = useMemo(
    () => (convexUrl ? new ConvexReactClient(convexUrl) : null),
    [convexUrl],
  );

  if (!convexUrl || !convexClient) {
    return (
      <main className="min-h-screen bg-black p-4 flex items-center justify-center text-red-400 font-mono text-sm">
        Missing NEXT_PUBLIC_CONVEX_URL in environment.
      </main>
    );
  }

  return (
    <ConvexProvider client={convexClient}>
      <CommandCenterContent />
    </ConvexProvider>
  );
}

function CommandCenterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const requestedWorkflowId = searchParams.get("workflowId");
  const workflowsQuery = useQuery(api.workflows.listWorkflows, {});
  const workflows = useMemo(() => workflowsQuery ?? [], [workflowsQuery]);

  const workflowId = useMemo<Id<"workflows"> | null>(() => {
    if (workflows.length === 0) {
      return null;
    }

    if (requestedWorkflowId) {
      const matchedWorkflow = workflows.find(
        (workflow) => workflow._id === requestedWorkflowId,
      );
      if (matchedWorkflow) {
        return matchedWorkflow._id;
      }
    }

    const runningWorkflow = workflows.find((workflow) => workflow.status === "running");
    return runningWorkflow?._id ?? workflows[0]._id;
  }, [requestedWorkflowId, workflows]);

  const agentRunsQuery = useQuery(
    api.workflows.listWorkflowAgentRuns,
    workflowId ? { workflowId } : "skip",
  );
  const agentRuns = useMemo(() => agentRunsQuery ?? [], [agentRunsQuery]);

  const cells = useMemo<GridCell[]>(() => {
    const sortedRuns = [...agentRuns].sort((leftRun, rightRun) => {
      const leftIsRunning = leftRun.status === "running";
      const rightIsRunning = rightRun.status === "running";

      if (leftIsRunning !== rightIsRunning) {
        return leftIsRunning ? -1 : 1;
      }

      const leftHasLiveUrl = normalizeLiveUrl(leftRun.liveUrl) !== null;
      const rightHasLiveUrl = normalizeLiveUrl(rightRun.liveUrl) !== null;

      if (leftHasLiveUrl !== rightHasLiveUrl) {
        return leftHasLiveUrl ? -1 : 1;
      }

      return rightRun.startedAt - leftRun.startedAt;
    });

    const runCells = sortedRuns
      .slice(0, MAX_CONCURRENT_STREAMS)
      .map((run) => ({
        id: run._id,
        type: run.agentType,
        title: `${WORKFLOW_AGENT_LABELS[run.agentType]} Agent`,
        liveUrl: normalizeLiveUrl(run.liveUrl),
      }));

    const placeholderCount = Math.max(0, MAX_CONCURRENT_STREAMS - runCells.length);
    const placeholderCells = Array.from({ length: placeholderCount }, (_, index) => {
      const agentType = WORKFLOW_AGENT_TYPE_VALUES[index % WORKFLOW_AGENT_TYPE_VALUES.length];
      return {
        id: `${workflowId ?? "none"}-placeholder-${index + 1}`,
        type: agentType,
        title: `${WORKFLOW_AGENT_LABELS[agentType]} Agent`,
        liveUrl: null,
      };
    });

    return [...runCells, ...placeholderCells];
  }, [agentRuns, workflowId]);

  const activeSessionCount = useMemo(
    () => cells.filter((cell) => cell.liveUrl !== null).length,
    [cells],
  );

  const renderCellContent = (cell: GridCell) => {
    return (
      <div className="relative w-full aspect-[1280/715] rounded-lg overflow-hidden border border-blue-500/30 bg-[#020510] shadow-[0_0_15px_rgba(59,130,246,0.1)] transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:border-blue-400/50 group">
        {cell.liveUrl ? (
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-auto rounded-lg bg-black">
            <iframe
              src={cell.liveUrl}
              title={cell.title}
              className="w-full h-full left-0 border-0"
              allow="clipboard-read; clipboard-write; fullscreen"
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[#3b82f6] text-[10px] uppercase font-mono tracking-widest animate-pulse opacity-50">
              Connecting
            </span>
          </div>
        )}

        <div className="absolute bottom-1.5 left-2 px-1 py-0.5 rounded text-[9px] font-mono text-white/50 bg-[#020510]/80 tracking-wider z-10 pointer-events-none group-hover:text-white/80 transition-colors">
          {cell.title.toUpperCase()}
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen w-full bg-black p-2 md:p-3 overflow-y-auto overflow-x-hidden flex flex-col font-sans">
      <div className="mb-1.5 flex items-center justify-between px-2 text-slate-400">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dev/assessment")}
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors bg-slate-900/50 border border-slate-700 hover:border-slate-500 rounded px-3 py-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            Back to Assessment
          </button>
          <h1 className="text-lg font-bold tracking-widest text-white uppercase flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400"><path d="M2 12h4l2-9 5 18 3-9h6" /></svg>
            Command Center
          </h1>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> SYSTEM ONLINE</span>
          <span>ACTIVE SESSIONS: {activeSessionCount}</span>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 px-4 pb-8 h-auto">
        {cells.map((cell) => (
          <div key={cell.id} className="w-full h-full">
            {renderCellContent(cell)}
          </div>
        ))}
      </div>
    </div>
  );
}
