"use client";

import { LandingBG } from "../components/LandingBG";
import { SearchBar } from "../components/SearchBar";


export default function DemoPage() {
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

                <SearchBar onSubmit={() => console.log("todo")} isSubmitting={false} />
            </div>
        </div>
    );
}
