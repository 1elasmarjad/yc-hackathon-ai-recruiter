"use client";

import { useState } from "react";
import { AgentStreamCard, AgentCategory, StreamData } from "@/components/AgentStreamCard";
import Link from "next/link";

// Mocking some fallback state if viewed statically.
// Ideally, the unified state would live in a global store so we can actually control them from here,
// but for the sake of the grid view, we assume they are either running elsewhere or offline.
const INITIAL_STREAMS: StreamData[] = [
    {
        id: "linkedin-posts",
        title: "LinkedIn Posts Agent",
        subtitle: "Search, verify, and summarize user posts",
        category: "posts",
        status: "idle",
        liveUrl: null,
    },
    {
        id: "devpost",
        title: "Devpost Agent",
        subtitle: "Wins and built projects summary",
        category: "profiles",
        status: "idle",
        liveUrl: null,
    },
    {
        id: "github",
        title: "GitHub Agent",
        subtitle: "Contributions and pinned repos with stars",
        category: "profiles",
        status: "idle",
        liveUrl: null,
    },
    {
        id: "linkedin",
        title: "LinkedIn Agent",
        subtitle: "Profile summary, projects, and interests",
        category: "profiles",
        status: "idle",
        liveUrl: null,
    },
];

type FilterType = "all" | AgentCategory;

export default function GridDashboardPage() {
    const [filter, setFilter] = useState<FilterType>("all");

    // Note: Since each individual run-state currently lives inside `app/dev/tools/page.tsx`,
    // this grid acts purely as a layout demonstration for the live stream embeds unless unified 
    // into Context/Zustand. For verifying the look, we map default data here over simulated states.
    const [streams] = useState<StreamData[]>(INITIAL_STREAMS);

    const filteredStreams = streams.filter(s => filter === "all" || s.category === filter);

    return (
        <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-8">
            <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-8">

                {/* Header & Controls */}
                <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between rounded-3xl border border-slate-800 bg-slate-900/40 p-6 md:p-8 backdrop-blur-xl">
                    <div>
                        <div className="mb-2 flex items-center gap-3">
                            <Link href="/dev/tools" className="rounded-full bg-slate-800/80 p-2 text-slate-400 transition hover:bg-slate-700 hover:text-white">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </Link>
                            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                                Livestream Grid
                            </h1>
                        </div>
                        <p className="text-sm text-slate-400 max-w-xl">
                            Monitor multiple agent browser sessions simultaneously. Click back to Dev Tools to launch and manage individual agents.
                        </p>
                    </div>

                    {/* Filter Toggles */}
                    <div className="flex items-center gap-1.5 rounded-lg border border-slate-700/50 bg-slate-950/50 p-1.5 shadow-inner">
                        {(["all", "posts", "profiles"] as FilterType[]).map((type) => (
                            <button
                                key={type}
                                onClick={() => setFilter(type)}
                                className={`flex-1 sm:flex-none rounded-md px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all ${filter === type
                                    ? "bg-cyan-500 text-slate-950 shadow-md"
                                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                                    }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Grid Layout */}
                <section className="grid grid-cols-1 gap-6 md:grid-cols-2 2xl:grid-cols-3">
                    {filteredStreams.map((stream) => (
                        <AgentStreamCard key={stream.id} stream={stream} />
                    ))}
                </section>

                {filteredStreams.length === 0 && (
                    <div className="flex h-64 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 text-slate-500">
                        <p className="text-sm">No agents found for this category.</p>
                    </div>
                )}

            </main>
        </div>
    );
}
