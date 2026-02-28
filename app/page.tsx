import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-16 text-neutral-100">
      <div className="mx-auto max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-900/60 p-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          YC Hackathon AI Recruiter
        </h1>
        <p className="mt-3 text-sm text-neutral-300">
          Development crawler tools are available under:
        </p>
        <p className="mt-2">
          <Link
            href="/dev/crawl/core"
            className="text-emerald-300 underline underline-offset-2"
          >
            /dev/crawl/core
          </Link>
        </p>
      </div>
    </main>
  );
}
