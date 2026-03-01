export type RunStatus = "idle" | "running" | "success" | "error";
export type AgentCategory = "posts" | "profiles";

export interface StreamData {
    id: string;
    title: string;
    subtitle: string;
    category: AgentCategory;
    status: RunStatus;
    liveUrl: string | null;
}

interface AgentStreamCardProps {
    stream: StreamData;
}

export function AgentStreamCard({ stream }: AgentStreamCardProps) {
    const isRunning = stream.status === "running";
    const hasLiveUrl = Boolean(stream.liveUrl);

    return (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-lg transition-all hover:border-slate-700">
            <div className="flex items-center justify-between border-b border-slate-800/60 bg-slate-950/50 px-4 py-3 backdrop-blur-sm">
                <div>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                        {stream.title}
                    </h3>
                    <p className="text-[10px] text-slate-400">{stream.subtitle}</p>
                </div>

                {/* Status Indicator Badge */}
                <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium tracking-wide ${isRunning
                        ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                        : "border-slate-700 bg-slate-800/50 text-slate-400"
                    }`}>
                    {isRunning && (
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500"></span>
                        </span>
                    )}
                    {!isRunning && (
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-500"></span>
                    )}
                    {isRunning ? "LIVE" : "OFFLINE"}
                </div>
            </div>

            <div className="relative aspect-video w-full bg-slate-950">
                {isRunning && hasLiveUrl ? (
                    <iframe
                        src={stream.liveUrl!}
                        title={`${stream.title} browser stream`}
                        className="h-full w-full border-0"
                        allow="clipboard-read; clipboard-write"
                    />
                ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-slate-500">
                        {isRunning && !hasLiveUrl ? (
                            <>
                                <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500/20 border-t-cyan-500"></div>
                                <p className="text-xs font-medium text-cyan-400/70 animate-pulse">Connecting to browser session...</p>
                            </>
                        ) : (
                            <>
                                <svg className="h-10 w-10 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
                                </svg>
                                <p className="text-xs">Agent offline</p>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
