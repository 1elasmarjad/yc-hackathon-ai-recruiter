"use client";

import { useMemo, type ReactElement } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useParams } from "next/navigation";
import { WorkflowResultsDashboard } from "./_components/WorkflowResultsDashboard";

export default function DemoWorkflowResultsPage(): ReactElement {
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
          workflow results.
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
      <WorkflowResultsDashboard workflowId={workflowId} />
    </ConvexProvider>
  );
}
