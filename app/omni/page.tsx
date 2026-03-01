"use client";

import { useState, useEffect } from "react";

// Types for our cells
type AgentType = "juicebox" | "linkedin" | "github" | "linkedin-posts" | "devpost";

interface GridCell {
    id: string;
    type: AgentType;
    title: string;
    isCenter?: boolean; // True for the 2x2 Juicebox cell
}

// Generate the cells for the 6x4 grid (24 total slots, but center takes 4, so 21 cells total)
const generateCells = (): GridCell[] => {
    const cells: GridCell[] = [];

    // A mix of agents to populate the surrounding tiles without any 'empty' slots
    const agentTypes: AgentType[] = [
        "linkedin", "github", "linkedin-posts", "devpost", "linkedin", "github",
        "github", "devpost", "linkedin-posts", "devpost", "linkedin", "github",
        "devpost", "linkedin-posts", "linkedin", "linkedin", "github", "linkedin-posts",
        "devpost", "github", "linkedin", "linkedin-posts", "devpost", "github"
    ];

    let agentIndex = 0;

    // We have 4 rows and 6 columns
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 6; col++) {
            // The center 2x2 box occupies rows 1,2 (0-indexed) and cols 2,3
            if ((row === 1 || row === 2) && (col === 2 || col === 3)) {
                // If it's the top-left of the center box, add the big cell
                if (row === 1 && col === 2) {
                    cells.push({
                        id: `cell-${row}-${col}`,
                        type: "juicebox",
                        title: "Juicebox Primary Agent",
                        isCenter: true,
                    });
                }
                // Skip adding cells for the rest of the 2x2 area
                continue;
            }

            // Add a regular 1x1 cell
            const type = agentTypes[agentIndex % agentTypes.length];
            agentIndex++;

            let title = `${type.charAt(0).toUpperCase() + type.slice(1)} Agent`;
            if (type === "linkedin-posts") {
                title = "Posts Agent";
            }

            cells.push({
                id: `cell-${row}-${col}`,
                type,
                title,
                isCenter: false,
            });
        }
    }

    return cells;
};

export default function OmniViewPage() {
    const [cells, setCells] = useState<GridCell[]>([]);

    useEffect(() => {
        setCells(generateCells());
    }, []);

    // Helper to render cell content
    const renderCellContent = (cell: GridCell) => {
        // For now these are just placeholder UI representing the agent sessions
        return (
            <div className="flex h-full w-full flex-col p-2">
                <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${cell.type === 'juicebox' ? 'bg-green-500 animate-pulse' : 'bg-cyan-500'}`} />
                        <span className="text-xs font-semibold text-slate-300">{cell.title}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">ID: {cell.id.replace('cell-', '')}</span>
                </div>

                {/* Mock browser viewport */}
                <div className="flex-1 rounded border border-slate-700 bg-slate-950 flex flex-col overflow-hidden relative group">
                    <div className="bg-slate-800 h-6 border-b border-slate-700 flex items-center px-2 gap-1.5 opacity-50 group-hover:opacity-100 transition-opacity">
                        <div className="h-2 w-2 rounded-full bg-red-500/50" />
                        <div className="h-2 w-2 rounded-full bg-yellow-500/50" />
                        <div className="h-2 w-2 rounded-full bg-green-500/50" />
                    </div>
                    <div className="flex-1 p-2 flex items-center justify-center">
                        <span className="text-xs text-slate-600">Waiting for live stream...</span>
                    </div>

                    {/* If it's the center Juicebox, show some mock text */}
                    {cell.type === 'juicebox' && (
                        <div className="absolute inset-0 bg-slate-950/80 p-4 flex flex-col justify-end text-sm text-green-400 font-mono border border-green-500/30">
                            <div>&gt; Init juicebox candidate search...</div>
                            <div className="animate-pulse">&gt; Analyzing profile data_</div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen w-full bg-black p-2 md:p-4 overflow-hidden flex flex-col">
            <div className="mb-2 flex items-center justify-between px-2 text-slate-400">
                <h1 className="text-lg font-bold tracking-widest text-white uppercase flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400"><path d="M2 12h4l2-9 5 18 3-9h6" /></svg>
                    Omni Command Center
                </h1>
                <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> SYSTEM ONLINE</span>
                    <span>ACTIVE NODES: 21/24</span>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-6 grid-rows-4 gap-2 h-[calc(100vh-60px)]">
                {cells.map((cell) => {
                    // Special styling for the 2x2 Juicebox cell
                    if (cell.isCenter) {
                        return (
                            <div
                                key={cell.id}
                                className="col-span-2 row-span-2 rounded-xl border border-green-500/40 bg-slate-900/80 shadow-[0_0_15px_rgba(34,197,94,0.15)] ring-1 ring-green-400/20 overflow-hidden"
                            >
                                {renderCellContent(cell)}
                            </div>
                        );
                    }

                    // Regular 1x1 cells
                    return (
                        <div
                            key={cell.id}
                            className={`rounded-lg border bg-slate-900/60 overflow-hidden border-slate-800 hover:border-cyan-500/50 transition-colors`}
                        >
                            {renderCellContent(cell)}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
