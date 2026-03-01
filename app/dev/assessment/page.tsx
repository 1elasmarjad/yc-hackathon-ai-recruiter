"use client";

import { useState, useEffect } from "react";

type AgentType = "juicebox" | "linkedin" | "github" | "linkedin-posts" | "devpost";

interface GridCell {
    id: string;
    type: AgentType;
    title: string;
}

const generateCells = (): GridCell[] => {
    const cells: GridCell[] = [];

    const surroundingAgents: AgentType[] = [
        "linkedin", "github", "linkedin-posts", "devpost", "linkedin",
        "github", "devpost", "linkedin-posts", "linkedin", "github", "devpost"
    ];

    const shuffledSurrounding = surroundingAgents.sort(() => Math.random() - 0.5);

    const agentTypes: AgentType[] = ["juicebox", ...shuffledSurrounding];

    for (let i = 0; i < 12; i++) {
        const type = agentTypes[i];
        let title = `${type.charAt(0).toUpperCase() + type.slice(1)} Agent`;
        if (type === "linkedin-posts") {
            title = "Posts Agent";
        } else if (type === "juicebox") {
            title = "Juicebox Agent";
        }

        cells.push({
            id: `cell-${i}`,
            type,
            title,
        });
    }

    return cells;
};

export default function CommandCenterPage() {
    const [cells, setCells] = useState<GridCell[]>([]);

    useEffect(() => {
        setCells(generateCells());
    }, []);

    const renderCellContent = (cell: GridCell) => {
        return (
            <div className="flex w-full h-full flex-col relative group rounded-lg border border-blue-500/30 overflow-hidden bg-[#020510] shadow-[0_0_15px_rgba(59,130,246,0.1)] transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:border-blue-400/50">
                <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                    <div className={`h-2 w-2 rounded-full ${cell.type === 'juicebox' ? 'bg-green-500 animate-pulse' : 'bg-cyan-500'}`} />
                    <span className="text-xs font-semibold text-slate-300">{cell.title}</span>
                </div>

                <div className="flex-1 flex items-center justify-center p-8">
                    <span className="text-xs text-slate-600 font-mono">Waiting for live stream...</span>
                </div>

                {cell.type === 'juicebox' && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 pb-3 flex flex-col justify-end text-[11px] text-green-400 font-mono">
                        <div>&gt; Init juicebox candidate search...</div>
                        <div className="animate-pulse">&gt; Analyzing profile data_</div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen w-full bg-black p-2 md:p-3 overflow-hidden flex flex-col font-sans">
            <div className="mb-2 flex items-center justify-between px-2 text-slate-400">
                <div className="flex items-center gap-4">
                    <h1 className="text-lg font-bold tracking-widest text-white uppercase flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400"><path d="M2 12h4l2-9 5 18 3-9h6" /></svg>
                        Command Center
                    </h1>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> SYSTEM ONLINE</span>
                    <span>ACTIVE SESSIONS: 12</span>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 grid-rows-3 gap-3 md:gap-4 h-[calc(100vh-60px)] px-2">
                {cells.map((cell) => (
                    <div key={cell.id} className="w-full h-full">
                        {renderCellContent(cell)}
                    </div>
                ))}
            </div>
        </div>
    );
}
