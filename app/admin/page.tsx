import Link from "next/link";
import DevToolsPage from "@/app/dev/tools/page";

export default function AdminPage() {
  return (
    <>
      <div className="border-b border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 sm:px-6">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
          <p className="text-sm font-semibold tracking-wide">Admin</p>
          <Link
            href="/admin/workflows"
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-cyan-300 hover:text-cyan-200"
          >
            Open Workflow Dashboard
          </Link>
        </div>
      </div>
      <DevToolsPage />
    </>
  );
}
