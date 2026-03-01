"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowUp, CornerDownRight } from "lucide-react";

const prompts = [
    "ML engineers with published papers and 500+ GitHub stars",
    "Devs who won hackathons and post on X about AI",
    "Engineers with viral LinkedIn posts about system design",
];

function useTypingPlaceholder(strings: string[], typingSpeed = 40, erasingSpeed = 25, pauseMs = 2000) {
    const [displayed, setDisplayed] = useState("");
    const indexRef = useRef(0);
    const phaseRef = useRef<"typing" | "pausing" | "erasing">("typing");
    const charRef = useRef(0);
    const active = useRef(true);

    useEffect(() => {
        active.current = true;
        let timeout: ReturnType<typeof setTimeout>;

        const tick = () => {
            if (!active.current) return;
            const current = strings[indexRef.current];
            const phase = phaseRef.current;

            if (phase === "typing") {
                charRef.current++;
                setDisplayed(current.slice(0, charRef.current));
                if (charRef.current >= current.length) {
                    phaseRef.current = "pausing";
                    timeout = setTimeout(tick, pauseMs);
                } else {
                    timeout = setTimeout(tick, typingSpeed);
                }
            } else if (phase === "pausing") {
                phaseRef.current = "erasing";
                timeout = setTimeout(tick, erasingSpeed);
            } else {
                charRef.current--;
                setDisplayed(current.slice(0, charRef.current));
                if (charRef.current <= 0) {
                    indexRef.current = (indexRef.current + 1) % strings.length;
                    phaseRef.current = "typing";
                    timeout = setTimeout(tick, typingSpeed + 200);
                } else {
                    timeout = setTimeout(tick, erasingSpeed);
                }
            }
        };

        timeout = setTimeout(tick, 500);
        return () => {
            active.current = false;
            clearTimeout(timeout);
        };
    }, [strings, typingSpeed, erasingSpeed, pauseMs]);

    return displayed;
}

export type SearchBarProps = {
    value?: string;
    onChange?: (value: string) => void;
    onSubmit?: (query: string) => void | Promise<void>;
    isSubmitting?: boolean;
};

export function SearchBar({
    value,
    onChange,
    onSubmit,
    isSubmitting = false,
}: SearchBarProps = {}) {
    const [internalQuery, setInternalQuery] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const animatedPlaceholder = useTypingPlaceholder(prompts);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const query = value ?? internalQuery;

    const setQuery = (next: string) => {
        if (value === undefined) setInternalQuery(next);
        onChange?.(next);
    };

    const canSubmit = query.trim().length > 0 && Boolean(onSubmit) && !isSubmitting;

    const submit = () => {
        if (!onSubmit) return;
        const trimmed = query.trim();
        if (!trimmed || isSubmitting) return;
        void onSubmit(trimmed);
    };

    useLayoutEffect(() => {
        const el = textareaRef.current;
        if (!el) return;

        const maxHeightPx = Number.parseFloat(window.getComputedStyle(el).maxHeight);
        el.style.height = "auto";

        const nextScrollHeight = el.scrollHeight;
        const cappedHeight = Number.isFinite(maxHeightPx)
            ? Math.min(nextScrollHeight, maxHeightPx)
            : nextScrollHeight;

        el.style.height = `${cappedHeight}px`;
        el.style.overflowY = nextScrollHeight > cappedHeight ? "auto" : "hidden";
    }, [query]);

    return (
        <div className="animate-fade-up" style={{ animationDelay: "0.2s" }}>
            <div
                className={`
          bg-[#141414] rounded-3xl border transition-all duration-500
          ${isFocused
                        ? "border-[#FF6B2C]/40 shadow-[0_0_60px_-15px_rgba(255,107,44,0.3)]"
                        : "border-zinc-800"
                    }
        `}
            >
                <div className="flex items-end px-3 py-3 gap-3">
                    <div className="relative flex-1 min-w-0">
                        <textarea
                            ref={textareaRef}
                            value={query}
                            onChange={(e) => {
                                const lines = e.target.value.split("\n");
                                if (lines.length <= 3) {
                                    setQuery(e.target.value);
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    submit();
                                    return;
                                }
                                if (e.key === "Enter") {
                                    const lines = query.split("\n");
                                    if (lines.length >= 3) {
                                        e.preventDefault();
                                    }
                                }
                            }}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            rows={1}
                            wrap="soft"
                            className="block w-full bg-transparent text-white text-base outline-none px-2 py-1 leading-normal resize-none max-h-[12rem] overflow-x-hidden whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
                        />
                        {query.length === 0 && !isFocused && (
                            <div className="absolute inset-0 flex items-start px-2 py-1 pointer-events-none">
                                <span className="text-zinc-600 text-base leading-normal">{animatedPlaceholder}</span>
                                <span className="inline-block w-[2px] h-[1.1em] bg-zinc-500 ml-[1px] translate-y-[0.15em] animate-cursor-blink" />
                            </div>
                        )}
                    </div>
                    <button
                        className={`
              p-2.5 rounded-xl transition-all duration-300
              ${canSubmit
                                ? "bg-[#FF6B2C] hover:bg-[#FF8040] shadow-lg shadow-[#FF6B2C]/20 cursor-pointer"
                                : "bg-zinc-800 cursor-not-allowed"
                            }
            `}
                        onClick={submit}
                        disabled={!canSubmit}
                    >
                        <ArrowUp className={`w-4 h-4 ${canSubmit ? "text-white" : "text-zinc-600"}`} />
                    </button>
                </div>
            </div>

            <div className="mt-6 flex flex-col items-start gap-2 animate-fade-up" style={{ animationDelay: "0.4s" }}>
                {prompts.map((prompt) => (
                    <button
                        key={prompt}
                        onClick={() => setQuery(prompt)}
                        className="flex items-center gap-2 text-sm text-zinc-500 hover:text-[#FF6B2C] transition-colors text-left cursor-pointer"
                    >
                        <CornerDownRight className="w-4 h-4 flex-shrink-0" />
                        <span>{prompt}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
