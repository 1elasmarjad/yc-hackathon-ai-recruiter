"use client";

import { useState, useRef, useEffect } from "react";
import { LandingBG } from "../components/LandingBG";
import { SearchBar } from "../components/SearchBar";
import { SlidersHorizontal, X, Link2, Plus, Trash2 } from "lucide-react";

export default function TestPage() {
    const [showFilters, setShowFilters] = useState(false);
    const [scrapeUrls, setScrapeUrls] = useState<string[]>([]);
    const [urlInput, setUrlInput] = useState("");
    const modalRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Close modal on outside click
    useEffect(() => {
        if (!showFilters) return;
        const handler = (e: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
                setShowFilters(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [showFilters]);

    // Focus input when modal opens
    useEffect(() => {
        if (showFilters) inputRef.current?.focus();
    }, [showFilters]);

    const addUrl = () => {
        const trimmed = urlInput.trim();
        if (!trimmed) return;
        try {
            new URL(trimmed);
        } catch {
            return;
        }
        if (!scrapeUrls.includes(trimmed)) {
            setScrapeUrls((prev) => [...prev, trimmed]);
        }
        setUrlInput("");
    };

    const removeUrl = (url: string) => {
        setScrapeUrls((prev) => prev.filter((u) => u !== url));
    };

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

                    {/* Advanced Filters Button — pinned under the submit button */}
                    <div className="absolute right-0 top-[72px] animate-fade-up z-20" style={{ animationDelay: "0.5s" }}>
                        <button
                            onClick={() => setShowFilters(true)}
                            className="group flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-800 bg-[#141414] hover:border-[#FF6B2C]/40 hover:bg-[#1a1a1a] transition-all duration-300 cursor-pointer"
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500 group-hover:text-[#FF6B2C] transition-colors duration-300" />
                            <span className="text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors duration-300">
                                Advanced Filters
                            </span>
                            {scrapeUrls.length > 0 && (
                                <span className="ml-0.5 w-4.5 h-4.5 rounded-full bg-[#FF6B2C] text-white text-[10px] font-semibold flex items-center justify-center">
                                    {scrapeUrls.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Scrape URL Modal Overlay */}
            {showFilters && (
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
                                    <h2 className="text-lg font-semibold text-white tracking-tight">Scrape URL</h2>
                                    <p className="text-xs text-zinc-500 mt-0.5">Add URLs to scrape candidate data from</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowFilters(false)}
                                className="p-2 rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4 text-zinc-500" />
                            </button>
                        </div>

                        <div className="px-7 pb-6">
                            {/* URL Input */}
                            <div className="flex gap-2 mb-4">
                                <div className="flex-1 relative">
                                    <input
                                        ref={inputRef}
                                        type="url"
                                        value={urlInput}
                                        onChange={(e) => setUrlInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                addUrl();
                                            }
                                        }}
                                        placeholder="https://example.com/profiles"
                                        className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-[#FF6B2C]/40 transition-colors duration-300"
                                    />
                                </div>
                                <button
                                    onClick={addUrl}
                                    disabled={!urlInput.trim()}
                                    className={`px-4 rounded-xl flex items-center gap-1.5 text-sm font-medium transition-all duration-300 cursor-pointer ${
                                        urlInput.trim()
                                            ? "bg-[#FF6B2C] hover:bg-[#FF8040] text-white shadow-lg shadow-[#FF6B2C]/20"
                                            : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                                    }`}
                                >
                                    <Plus className="w-4 h-4" />
                                    Add
                                </button>
                            </div>

                            {/* URL List */}
                            <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                                {scrapeUrls.length === 0 ? (
                                    <div className="text-center py-8 text-zinc-600 text-sm">
                                        No URLs added yet. Paste a URL above to get started.
                                    </div>
                                ) : (
                                    scrapeUrls.map((url) => (
                                        <div
                                            key={url}
                                            className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-[#1a1a1a] border border-zinc-800/50 hover:border-zinc-700 transition-colors duration-200"
                                        >
                                            <Link2 className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
                                            <span className="text-sm text-zinc-300 truncate flex-1">{url}</span>
                                            <button
                                                onClick={() => removeUrl(url)}
                                                className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-zinc-700 transition-all duration-200 cursor-pointer"
                                            >
                                                <Trash2 className="w-3.5 h-3.5 text-zinc-500 hover:text-red-400" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Footer */}
                            {scrapeUrls.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-zinc-800/50 flex items-center justify-between">
                                    <span className="text-xs text-zinc-600">
                                        {scrapeUrls.length} URL{scrapeUrls.length !== 1 ? "s" : ""} added
                                    </span>
                                    <button
                                        onClick={() => setShowFilters(false)}
                                        className="px-5 py-2 rounded-xl bg-[#FF6B2C] hover:bg-[#FF8040] text-white text-sm font-medium transition-colors duration-300 cursor-pointer shadow-lg shadow-[#FF6B2C]/20"
                                    >
                                        Done
                                    </button>
                                </div>
                            )}
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
