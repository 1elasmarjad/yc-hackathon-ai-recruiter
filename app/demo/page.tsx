"use client";

import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal, X, Link2 } from "lucide-react";
import { LandingBG } from "../components/LandingBG";
import { SearchBar } from "../components/SearchBar";

const DEFAULT_URL = "https://chat.juicebox.work/project/iJ3hlJYmNvzrk4rzJepd/search?search_id=DXA9j5FEYQ4pnxemyfqp";
const DEFAULT_TOTAL_PAGES = "1";

export default function DemoPage() {
    const [showSettings, setShowSettings] = useState(false);
    const [targetUrl, setTargetUrl] = useState<string | null>(DEFAULT_URL);
    const [totalPages, setTotalPages] = useState<string | null>(DEFAULT_TOTAL_PAGES);
    const modalRef = useRef<HTMLDivElement>(null);
    const urlInputRef = useRef<HTMLInputElement>(null);

    // Close modal on outside click
    useEffect(() => {
        if (!showSettings) return;
        const handler = (e: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
                setShowSettings(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [showSettings]);

    // Focus URL input when modal opens
    useEffect(() => {
        if (showSettings) urlInputRef.current?.focus();
    }, [showSettings]);

    const hasCustomSettings =
        (targetUrl ?? "").trim() !== DEFAULT_URL || (totalPages ?? "").trim() !== DEFAULT_TOTAL_PAGES;

    return (
        <div className="min-h-screen bg-[#0A0A0A] font-display relative overflow-hidden flex items-center justify-center">
            <LandingBG />

            <div className="relative z-10 w-full max-w-3xl px-6 -mt-[100px]">
                <div className="text-center mb-10 animate-fade-up" style={{ animationDelay: "0.1s" }}>
                    <div className="text-xs text-[#FF6B2C] tracking-widest uppercase mb-4 font-medium">
                        AI-Native Talent Discovery
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">
                        Find anyone, anywhere.
                    </h1>
                    <p className="text-zinc-500 text-base">Who is your ideal candidate?</p>
                </div>

                <div className="relative">
                    <SearchBar onSubmit={() => console.log("todo")} isSubmitting={false} />

                    {/* Advanced Settings Button */}
                    <div className="absolute right-0 top-[72px] animate-fade-up z-20" style={{ animationDelay: "0.5s" }}>
                        <button
                            onClick={() => setShowSettings(true)}
                            className="group flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-800 bg-[#141414] hover:border-[#FF6B2C]/40 hover:bg-[#1a1a1a] transition-all duration-300 cursor-pointer"
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500 group-hover:text-[#FF6B2C] transition-colors duration-300" />
                            <span className="text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors duration-300">
                                Advanced Settings
                            </span>
                            {hasCustomSettings && (
                                <span className="w-2 h-2 rounded-full bg-[#FF6B2C]" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Advanced Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]">
                    <div
                        ref={modalRef}
                        className="w-full max-w-lg mx-4 bg-[#111111] border border-zinc-800 rounded-3xl shadow-2xl shadow-black/50 animate-[scaleIn_200ms_ease-out]"
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-7 pt-6 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-[#FF6B2C]/10 flex items-center justify-center">
                                    <Link2 className="w-4 h-4 text-[#FF6B2C]" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-white tracking-tight">Advanced Settings</h2>
                                    <p className="text-xs text-zinc-500 mt-0.5">Configure the target URL and pagination</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowSettings(false)}
                                className="p-2 rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4 text-zinc-500" />
                            </button>
                        </div>

                        <div className="px-7 pb-6 space-y-4">
                            {/* URL Input */}
                            <label className="block">
                                <span className="text-sm text-zinc-400 mb-1.5 block">Target URL</span>
                                <input
                                    ref={urlInputRef}
                                    type="url"
                                    value={targetUrl ?? ""}
                                    onChange={(e) => setTargetUrl(e.target.value)}
                                    placeholder="https://app.juicebox.work/..."
                                    className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-[#FF6B2C]/40 transition-colors duration-300"
                                />
                            </label>

                            {/* Total Pages Input */}
                            <label className="block">
                                <span className="text-sm text-zinc-400 mb-1.5 block">Total Pages</span>
                                <input
                                    type="number"
                                    min={1}
                                    step={1}
                                    value={totalPages ?? ""}
                                    onChange={(e) => setTotalPages(e.target.value)}
                                    className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-[#FF6B2C]/40 transition-colors duration-300"
                                />
                            </label>

                            {/* Footer */}
                            <div className="pt-2 flex justify-end">
                                <button
                                    onClick={() => setShowSettings(false)}
                                    className="px-5 py-2 rounded-xl bg-[#FF6B2C] hover:bg-[#FF8040] text-white text-sm font-medium transition-colors duration-300 cursor-pointer shadow-lg shadow-[#FF6B2C]/20"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Keyframe animations */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.95) translateY(8px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
}
