"use client";

import { useState } from "react";
import { Phone, Check, Shield, Loader2 } from "lucide-react";
import { usePipelineState } from "../../shared/use-pipeline-state";
import type {
  PipelineCandidate,
  PipelineState,
  StatusFilter,
} from "../../shared/types";

type CallStatus = "idle" | "calling" | "called" | "error";

type CommandCenterProps = {
  state?: PipelineState;
  rightActionLabel?: string;
  statusLabel?: string;
  showCommandCenterButton?: boolean;
  commandCenterButtonLabel?: string;
  onCommandCenterClick?: () => void;
  onOpenCandidateFetchedData?: (candidate: PipelineCandidate) => void;
  isLoading?: boolean;
};

function getDisplayName(candidate: PipelineCandidate): string {
  const name = candidate.name?.trim();
  if (name) {
    return name;
  }

  const sourceCandidateId = candidate.sourceCandidateId?.trim();
  if (sourceCandidateId) {
    return sourceCandidateId;
  }

  return candidate.id;
}

function StatusBadge({
  status,
  outcome,
}: {
  status: PipelineCandidate["status"];
  outcome: PipelineCandidate["outcome"];
}) {
  if (status === "pending") {
    return (
      <span className="rounded border border-slate-600/50 bg-slate-700/50 px-2 py-0.5 text-xs font-sans text-slate-400">
        PENDING
      </span>
    );
  }

  if (status === "assessing") {
    return (
      <span className="animate-pulse rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-sans text-amber-400">
        ASSESSING
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span className="rounded border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs font-sans text-red-400">
        FAILED
      </span>
    );
  }

  if (outcome === "fit") {
    return (
      <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-sans text-emerald-400">
        FIT
      </span>
    );
  }

  if (outcome === "possible_fit") {
    return (
      <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-sans text-amber-300">
        POSSIBLE FIT
      </span>
    );
  }

  if (outcome === "rejected") {
    return (
      <span className="rounded border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs font-sans text-red-400">
        REJECTED
      </span>
    );
  }

  return (
    <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-xs font-sans text-cyan-300">
      COMPLETED
    </span>
  );
}

function CriterionDot({ met }: { met: boolean | null }) {
  const base = "inline-block h-2.5 w-2.5 rounded-full transition-all duration-500";

  if (met === null) {
    return <span className={`${base} bg-slate-600`} />;
  }

  return <span className={`${base} ${met ? "bg-emerald-400" : "bg-red-400"}`} />;
}

function SendCallButton({
  candidate,
  callStatus,
  onSendCall,
}: {
  candidate: PipelineCandidate;
  callStatus: CallStatus;
  onSendCall: (candidateId: string) => void;
}) {
  const isAssessed = candidate.status === "assessed";
  const isDisabled = !isAssessed || callStatus === "calling" || callStatus === "called";

  if (callStatus === "called") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-400">
        <Check className="h-3 w-3" />
        Called
      </span>
    );
  }

  if (callStatus === "calling") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[10px] text-blue-300">
        <Loader2 className="h-3 w-3 animate-spin" />
        Calling
      </span>
    );
  }

  if (callStatus === "error") {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSendCall(candidate.id);
        }}
        className="inline-flex items-center gap-1 rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] text-red-400 transition-colors hover:bg-red-500/20"
      >
        <Phone className="h-3 w-3" />
        Retry
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={(e) => {
        e.stopPropagation();
        onSendCall(candidate.id);
      }}
      className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] transition-colors ${
        isDisabled
          ? "cursor-not-allowed border-slate-700/30 bg-slate-800/30 text-slate-600"
          : "border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20"
      }`}
    >
      <Phone className="h-3 w-3" />
      Call
    </button>
  );
}

function Sidebar({
  candidate,
  onOpenCandidateFetchedData,
}: {
  candidate: PipelineCandidate;
  onOpenCandidateFetchedData?: (candidate: PipelineCandidate) => void;
}) {
  const displayName = getDisplayName(candidate);

  const hasProfileMeta =
    candidate.headline !== null ||
    candidate.location !== null ||
    candidate.yearsExperience !== null ||
    candidate.email !== null ||
    candidate.linkedinUrl ||
    candidate.githubUrl ||
    candidate.skills.length > 0;

  return (
    <div className="h-full overflow-y-auto px-6 py-5">
      <div className="mb-5">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded border border-slate-600/30 bg-slate-700/50 text-sm font-sans text-slate-300">
            {candidate.avatar ?? "--"}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">{displayName}</h2>
            {candidate.headline ? (
              <p className="text-xs text-slate-500">{candidate.headline}</p>
            ) : null}
            {candidate.sourceCandidateId ? (
              <p className="mt-0.5 text-[11px] text-slate-600">
                Source ID: {candidate.sourceCandidateId}
              </p>
            ) : null}
          </div>
        </div>

        {candidate.location || candidate.yearsExperience !== null ? (
          <div className="mb-3 flex gap-2 text-xs text-slate-500">
            {candidate.location ? <span>{candidate.location}</span> : null}
            {candidate.location && candidate.yearsExperience !== null ? <span>&middot;</span> : null}
            {candidate.yearsExperience !== null ? (
              <span>{candidate.yearsExperience} yrs exp</span>
            ) : null}
          </div>
        ) : null}

        {candidate.email ? (
          <div className="mb-2 text-xs text-slate-500">{candidate.email}</div>
        ) : null}

        {candidate.linkedinUrl || candidate.githubUrl || onOpenCandidateFetchedData ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {candidate.linkedinUrl ? (
              <a
                href={candidate.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded border border-slate-700 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-300 hover:border-cyan-300 hover:text-cyan-200"
              >
                LinkedIn
              </a>
            ) : null}
            {candidate.githubUrl ? (
              <a
                href={candidate.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded border border-slate-700 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-300 hover:border-cyan-300 hover:text-cyan-200"
              >
                GitHub
              </a>
            ) : null}
            {onOpenCandidateFetchedData ? (
              <button
                type="button"
                onClick={() => onOpenCandidateFetchedData(candidate)}
                className="rounded border border-slate-700 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-300 hover:border-cyan-300 hover:text-cyan-200"
              >
                Fetched Data
              </button>
            ) : null}
          </div>
        ) : null}

        {candidate.skills.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {candidate.skills.map((skill) => (
              <span
                key={skill}
                className="rounded border border-slate-700/50 bg-slate-800 px-1.5 py-0.5 text-[10px] font-sans text-slate-400"
              >
                {skill}
              </span>
            ))}
          </div>
        ) : null}

        {!hasProfileMeta ? (
          <p className="text-xs text-slate-600">No profile metadata available.</p>
        ) : null}
      </div>

      {candidate.error ? (
        <div className="mb-4 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {candidate.error}
        </div>
      ) : null}

      <div className="space-y-3 border-t border-slate-700/50 pt-4">
        <div className="text-[10px] font-sans uppercase tracking-wider text-slate-500">
          Criteria Evaluation
        </div>

        {candidate.criteria.length === 0 ? (
          <div className="text-xs text-slate-600">No assessment criteria available yet.</div>
        ) : null}

        {candidate.criteria.map((criterion, index) => (
          <div
            key={`${criterion.criterion}-${index}`}
            className={`flex items-start gap-3 transition-all duration-500 ${
              criterion.met !== null ? "translate-y-0 opacity-100" : "opacity-50"
            }`}
          >
            <CriterionDot met={criterion.met} />
            <div>
              <div className="text-xs font-medium text-slate-300">{criterion.criterion}</div>
              {criterion.met !== null ? (
                <div className="mt-0.5 animate-fade-in text-xs text-slate-500">
                  {criterion.reasoning ?? "No evidence captured."}
                </div>
              ) : (
                <div className="mt-0.5 text-xs italic text-slate-600">Awaiting evaluation...</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {candidate.summary ? (
        <div className="mt-4 border-t border-slate-700/50 pt-4">
          <div className="mb-1 text-[10px] font-sans uppercase tracking-wider text-slate-500">
            Summary
          </div>
          <div className="text-xs text-slate-400">{candidate.summary}</div>
        </div>
      ) : null}
    </div>
  );
}

function EmptySidebar() {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="text-center">
        <div className="mb-1 text-sm font-sans text-slate-600">No candidate selected</div>
        <div className="text-xs text-slate-700">Click a row to inspect</div>
      </div>
    </div>
  );
}

export function CommandCenter({
  state,
  rightActionLabel = "All seeing view",
  statusLabel,
  showCommandCenterButton = false,
  commandCenterButtonLabel = "Command Center",
  onCommandCenterClick,
  onOpenCandidateFetchedData,
  isLoading = false,
}: CommandCenterProps) {
  const internalState = usePipelineState();
  const resolvedState = state ?? internalState;

  const {
    candidates,
    stats,
    statusFilter,
    setStatusFilter,
    selectedCandidate,
    selectCandidate,
  } = resolvedState;

  const [callStatuses, setCallStatuses] = useState<Record<string, CallStatus>>({});

  async function handleSendCall(candidateId: string): Promise<void> {
    setCallStatuses((prev) => ({ ...prev, [candidateId]: "calling" }));

    try {
      const response = await fetch("/api/vapi/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId }),
      });

      if (!response.ok) {
        setCallStatuses((prev) => ({ ...prev, [candidateId]: "error" }));
        return;
      }

      setCallStatuses((prev) => ({ ...prev, [candidateId]: "called" }));
    } catch {
      setCallStatuses((prev) => ({ ...prev, [candidateId]: "error" }));
    }
  }

  const filters: { label: string; value: StatusFilter; count: number }[] = [
    { label: "FIT", value: "fit", count: stats.fit },
    { label: "ASSESSING", value: "assessing", count: stats.assessing },
    { label: "PENDING", value: "pending", count: stats.pending },
    { label: "REJECTED", value: "rejected", count: stats.rejected },
    { label: "FAILED", value: "failed", count: stats.failed },
    { label: "ALL", value: "all", count: stats.total },
  ];
  const hasResultsControls = statusLabel !== undefined || showCommandCenterButton;
  const [isCommandCenterOpen, setIsCommandCenterOpen] = useState<boolean>(true);

  function handleCommandCenterClick(): void {
    if (onCommandCenterClick) {
      onCommandCenterClick();
      return;
    }

    setIsCommandCenterOpen((previous) => !previous);
  }

  return (
    <div
      className="flex h-screen flex-col bg-[#0c1222] text-slate-200"
      style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
    >
      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.4s ease-out; }
      `}</style>

      <div className="shrink-0 border-b border-slate-800/50 bg-[#0a0f1a] px-6 py-3">
        <div className="flex items-center gap-1">
          {filters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`rounded px-3 py-1 text-xs font-sans transition-colors ${
                statusFilter === filter.value
                  ? "border border-blue-500/30 bg-blue-500/20 text-blue-300"
                  : "border border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              {filter.label} <span className="opacity-60">({filter.count})</span>
            </button>
          ))}
          {hasResultsControls ? (
            <div className="ml-auto flex items-center gap-2">
              {statusLabel ? (
                <span className="rounded border border-slate-600/60 bg-slate-700/50 px-3 py-1.5 text-xs font-sans uppercase tracking-wide text-slate-300">
                  Workflow: {statusLabel}
                </span>
              ) : null}
              {showCommandCenterButton ? (
                <button
                  type="button"
                  onClick={handleCommandCenterClick}
                  aria-pressed={isCommandCenterOpen}
                  className="flex items-center gap-2 rounded border border-red-400/40 bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/60"
                >
                  <Shield className="h-4 w-4" aria-hidden="true" />
                  {commandCenterButtonLabel}
                </button>
              ) : null}
            </div>
          ) : (
            <button className="ml-auto rounded border border-blue-500/25 bg-blue-500/15 px-3 py-1.5 text-xs font-sans text-blue-300 transition-colors hover:bg-blue-500/25">
              {rightActionLabel}
            </button>
          )}
        </div>
      </div>

      {showCommandCenterButton && !isCommandCenterOpen ? (
        <div className="flex min-h-0 flex-1 items-center justify-center bg-[#0a0f1a] px-6">
          <div className="rounded border border-slate-700/60 bg-slate-800/40 px-4 py-3 text-sm text-slate-300">
            Command Center hidden. Click the red button to open it.
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          <div className="w-1/2 overflow-y-auto border-r border-slate-700/50">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-[#0c1222]">
                <tr className="border-b border-slate-800 text-[10px] font-sans uppercase tracking-wider text-slate-500">
                  <th className="w-8 px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Candidate</th>
                  <th className="px-4 py-2 text-center">Criteria</th>
                  <th className="px-4 py-2 text-center">Status</th>
                  <th className="px-4 py-2 text-center">Call</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center">
                      <div className="inline-flex items-center gap-2 rounded border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-200">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-blue-300" />
                        Loading candidates...
                      </div>
                    </td>
                  </tr>
                ) : candidates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-xs text-slate-500">
                      No candidates for the selected filter.
                    </td>
                  </tr>
                ) : (
                  candidates.map((candidate, index) => (
                    <tr
                      key={candidate.id}
                      onClick={() => selectCandidate(candidate.id)}
                      className={`cursor-pointer border-b border-slate-800/30 transition-colors ${
                        selectedCandidate?.id === candidate.id
                          ? "border-l-2 border-l-blue-400 bg-blue-500/10"
                          : "hover:bg-slate-800/20"
                      }`}
                    >
                      <td className="px-4 py-2.5 text-xs font-sans text-slate-600">
                        {String(index + 1).padStart(2, "0")}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded border border-slate-600/30 bg-slate-700/50 text-[10px] font-sans text-slate-400">
                            {candidate.avatar ?? "--"}
                          </div>
                          <div className="min-w-0">
                            <span className="block truncate font-medium text-slate-200">
                              {getDisplayName(candidate)}
                            </span>
                            {candidate.sourceCandidateId ? (
                              <span className="block truncate text-[10px] text-slate-500">
                                {candidate.sourceCandidateId}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        {candidate.criteria.length > 0 ? (
                          <div className="flex items-center justify-center gap-1.5">
                            {candidate.criteria.map((criterion, criterionIndex) => (
                              <CriterionDot key={criterionIndex} met={criterion.met} />
                            ))}
                          </div>
                        ) : (
                          <div className="text-center text-[10px] text-slate-600">-</div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <StatusBadge status={candidate.status} outcome={candidate.outcome} />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <SendCallButton
                          candidate={candidate}
                          callStatus={callStatuses[candidate.id] ?? "idle"}
                          onSendCall={handleSendCall}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="w-1/2 bg-[#0a0f1a]">
            {selectedCandidate ? (
              <Sidebar
                candidate={selectedCandidate}
                onOpenCandidateFetchedData={onOpenCandidateFetchedData}
              />
            ) : (
              <EmptySidebar />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
