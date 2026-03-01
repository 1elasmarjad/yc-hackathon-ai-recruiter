"use client";

import { usePipelineState } from "../../shared/use-pipeline-state";
import type { PipelineCandidate, StatusFilter } from "../../shared/types";

function StatusBadge({ status, outcome }: { status: PipelineCandidate["status"]; outcome: PipelineCandidate["outcome"] }) {
  if (status === "pending") {
    return <span className="px-2 py-0.5 text-xs font-sans rounded bg-slate-700/50 text-slate-400 border border-slate-600/50">PENDING</span>;
  }
  if (status === "assessing") {
    return <span className="px-2 py-0.5 text-xs font-sans rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">ASSESSING</span>;
  }
  if (outcome === "fit") {
    return <span className="px-2 py-0.5 text-xs font-sans rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">FIT</span>;
  }
  return <span className="px-2 py-0.5 text-xs font-sans rounded bg-red-500/10 text-red-400 border border-red-500/30">REJECTED</span>;
}

function CriterionDot({ met, animate }: { met: boolean | null; animate?: boolean }) {
  const base = "w-2.5 h-2.5 rounded-full inline-block transition-all duration-500";
  if (met === null) return <span className={`${base} bg-slate-600 scale-100`} />;
  const color = met ? "bg-emerald-400" : "bg-red-400";
  return <span className={`${base} ${color} ${animate ? "animate-criterion-pop" : ""}`} />;
}

function Sidebar({ candidate }: { candidate: PipelineCandidate }) {
  return (
    <div className="h-full overflow-y-auto px-6 py-5">
      <div className="mb-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded bg-slate-700/50 flex items-center justify-center text-sm font-sans text-slate-300 border border-slate-600/30">
            {candidate.avatar}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">{candidate.name}</h2>
            <p className="text-xs text-slate-500">{candidate.headline}</p>
          </div>
        </div>
        <div className="flex gap-3 text-xs text-slate-500 mb-3">
          <span>{candidate.location}</span>
          <span>&middot;</span>
          <span>{candidate.yearsExperience} yrs exp</span>
        </div>
        <div className="text-xs text-slate-600 mb-3">{candidate.email}</div>
        <div className="flex flex-wrap gap-1">
          {candidate.skills.map((s) => (
            <span key={s} className="px-1.5 py-0.5 text-[10px] font-sans bg-slate-800 text-slate-400 rounded border border-slate-700/50">{s}</span>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-700/50 pt-4 space-y-3">
        <div className="text-[10px] text-slate-500 font-sans uppercase tracking-wider">Criteria Evaluation</div>
        {candidate.criteria.map((c, i) => (
          <div
            key={i}
            className={`flex gap-3 items-start transition-all duration-500 ${
              c.met !== null ? "opacity-100 translate-y-0" : "opacity-50"
            }`}
          >
            <CriterionDot met={c.met} />
            <div>
              <div className="text-xs text-slate-300 font-medium">{c.criterion}</div>
              {c.met !== null ? (
                <div className="text-xs text-slate-500 mt-0.5 animate-fade-in">{c.reasoning}</div>
              ) : (
                <div className="text-xs text-slate-600 mt-0.5 italic">Awaiting evaluation...</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-700/50 mt-4 pt-4">
        <div className="text-[10px] text-slate-500 font-sans uppercase tracking-wider mb-1">Summary</div>
        <div className="text-xs text-slate-400">{candidate.summary}</div>
      </div>
    </div>
  );
}

function EmptySidebar() {
  return (
    <div className="h-full flex items-center justify-center px-6">
      <div className="text-center">
        <div className="text-slate-600 text-sm font-sans mb-1">No candidate selected</div>
        <div className="text-slate-700 text-xs">Click a row to inspect</div>
      </div>
    </div>
  );
}

export function CommandCenter() {
  const { candidates, stats, statusFilter, setStatusFilter, selectedCandidate, selectCandidate } = usePipelineState();

  const filters: { label: string; value: StatusFilter; count: number }[] = [
    { label: "FIT", value: "fit", count: stats.fit },
    { label: "PENDING", value: "pending", count: stats.pending },
    { label: "REJECTED", value: "rejected", count: stats.rejected },
    { label: "ALL", value: "all", count: stats.total },
  ];

  return (
    <div className="h-screen flex flex-col bg-[#0c1222] text-slate-200" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      <style>{`
        @keyframes criterion-pop { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.4); } 100% { transform: scale(1); opacity: 1; } }
        .animate-criterion-pop { animation: criterion-pop 0.4s ease-out; }
        @keyframes fade-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.4s ease-out; }
      `}</style>

      {/* Filter bar */}
      <div className="border-b border-slate-800/50 px-6 py-3 bg-[#0a0f1a] shrink-0">
        <div className="flex items-center gap-1">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1 text-xs font-sans rounded transition-colors ${
                statusFilter === f.value
                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                  : "text-slate-500 hover:text-slate-300 border border-transparent"
              }`}
            >
              {f.label} <span className="opacity-60">({f.count})</span>
            </button>
          ))}
          <button className="ml-auto px-3 py-1.5 text-xs font-sans rounded bg-blue-500/15 text-blue-300 border border-blue-500/25 hover:bg-blue-500/25 transition-colors">
            All seeing view
          </button>
        </div>
      </div>

      {/* Main content: table left, sidebar right */}
      <div className="flex flex-1 min-h-0">
        {/* Table half */}
        <div className="w-1/2 overflow-y-auto border-r border-slate-700/50">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#0c1222] z-10">
              <tr className="text-[10px] font-sans text-slate-500 uppercase tracking-wider border-b border-slate-800">
                <th className="text-left py-2 px-4 w-8">#</th>
                <th className="text-left py-2 px-4">Candidate</th>
                <th className="text-center py-2 px-4">Criteria</th>
                <th className="text-center py-2 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c, i) => (
                <tr
                  key={c.id}
                  onClick={() => selectCandidate(c.id)}
                  className={`
                    border-b border-slate-800/30 cursor-pointer transition-colors
                    ${selectedCandidate?.id === c.id ? "bg-blue-500/10 border-l-2 border-l-blue-400" : "hover:bg-slate-800/20"}
                  `}
                >
                  <td className="py-2.5 px-4 font-sans text-slate-600 text-xs">{String(i + 1).padStart(2, "0")}</td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded bg-slate-700/50 flex items-center justify-center text-[10px] font-sans text-slate-400 border border-slate-600/30">
                        {c.avatar}
                      </div>
                      <span className="font-medium text-slate-200">{c.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center justify-center gap-1.5">
                      {c.criteria.map((cr, j) => (
                        <CriterionDot key={j} met={cr.met} />
                      ))}
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <StatusBadge status={c.status} outcome={c.outcome} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sidebar half */}
        <div className="w-1/2 bg-[#0a0f1a]">
          {selectedCandidate ? (
            <Sidebar candidate={selectedCandidate} />
          ) : (
            <EmptySidebar />
          )}
        </div>
      </div>
    </div>
  );
}
