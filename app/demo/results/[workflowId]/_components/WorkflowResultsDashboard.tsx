"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { PipelineCandidate } from "@/app/landing-page/_components/shared/types";
import { CommandCenter } from "@/app/landing-page/_components/variations/v1-command-center/CommandCenter";
import { useWorkflowPipelineState } from "./use-workflow-pipeline-state";

type WorkflowResultsDashboardProps = {
  workflowId: string;
};

function ErrorState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-red-500/40 bg-red-500/10 p-6">
        <h1 className="text-lg font-semibold text-red-200">{title}</h1>
        <p className="mt-2 text-sm text-red-300">{message}</p>
      </div>
    </main>
  );
}

export function WorkflowResultsDashboard({
  workflowId,
}: WorkflowResultsDashboardProps) {
  const router = useRouter();
  const workflowState = useWorkflowPipelineState(workflowId);
  const showFetchedDataButton = process.env.NODE_ENV !== "production";
  const isPipelineLoading =
    workflowState.workflow?.status === "running" &&
    workflowState.allCandidates.length === 0;

  const handleOpenCandidateFetchedData = useCallback(
    (candidate: PipelineCandidate): void => {
      const rawCandidate = workflowState.candidateDocs.find(
        (candidateDoc) => candidateDoc._id === candidate.id,
      );

      if (!rawCandidate) {
        return;
      }

      const candidateRuns = workflowState.workflowAgentRuns
        .filter((run) => run.candidateId === rawCandidate._id)
        .sort((runA, runB) => runA.startedAt - runB.startedAt);

      const payload = {
        candidate: rawCandidate,
        agentRuns: candidateRuns,
        workflow: workflowState.workflow
          ? {
            id: workflowState.workflow._id,
            name: workflowState.workflow.name,
            aiCriteria: workflowState.workflow.aiCriteria ?? null,
          }
          : null,
      };

      const jsonBlob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const jsonBlobUrl = URL.createObjectURL(jsonBlob);
      const openedWindow = window.open(jsonBlobUrl, "_blank", "noopener,noreferrer");

      if (!openedWindow) {
        URL.revokeObjectURL(jsonBlobUrl);
        return;
      }

      window.setTimeout(() => URL.revokeObjectURL(jsonBlobUrl), 60_000);
    },
    [workflowState.candidateDocs, workflowState.workflow, workflowState.workflowAgentRuns],
  );

  if (workflowState.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0c1222] px-4 text-slate-300">
        <p className="text-sm">Loading workflow candidates...</p>
      </main>
    );
  }

  if (workflowState.invalidWorkflow) {
    return (
      <ErrorState
        title="Workflow not found"
        message={`No workflow exists for id \"${workflowId}\".`}
      />
    );
  }

  if (workflowState.missingWorkflow || workflowState.workflow === null) {
    return (
      <ErrorState
        title="Workflow unavailable"
        message="The workflow could not be loaded. It may have been removed."
      />
    );
  }

  return (
    <CommandCenter
      state={workflowState}
      statusLabel={workflowState.workflow.status}
      showCommandCenterButton
      commandCenterButtonLabel="Command Center"
      onCommandCenterClick={() =>
        router.push(`/command-center?workflowId=${encodeURIComponent(workflowId)}`)
      }
      onOpenCandidateFetchedData={
        showFetchedDataButton ? handleOpenCandidateFetchedData : undefined
      }
      isLoading={isPipelineLoading}
    />
  );
}
