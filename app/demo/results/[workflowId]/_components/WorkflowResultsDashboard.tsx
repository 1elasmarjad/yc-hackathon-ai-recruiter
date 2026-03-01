"use client";

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
  const workflowState = useWorkflowPipelineState(workflowId);
  const isPipelineLoading =
    workflowState.workflow?.status === "running" &&
    workflowState.allCandidates.length === 0;

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
      rightActionLabel={`Workflow: ${workflowState.workflow.status}`}
      isLoading={isPipelineLoading}
    />
  );
}
