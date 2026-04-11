"use client";

import Sidebar from "@/components/ui/Sidebar";
import TopBar from "@/components/ui/TopBar";
import { api } from "@/lib/api";
import { CandidateListItem } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";

const STATUS_COLORS: Record<string, string> = {
  done: "bg-emerald-100 text-emerald-700",
  processing: "bg-amber-100 text-amber-700",
  pending: "bg-slate-100 text-slate-600",
  failed: "bg-error-container text-on-error-container",
};

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<CandidateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api
      .getCandidates(0, 100)
      .then(setCandidates)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = candidates.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.filename.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="ml-[220px] flex-1">
        <TopBar />
        <div className="pt-24 px-8 pb-12">
          <div className="mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-on-surface">
                All Candidates
              </h1>
              <p className="text-on-surface-variant mt-1 text-sm">
                {candidates.length} candidate(s) in the system
              </p>
            </div>
            <Link
              href="/"
              className="primary-gradient text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-primary/20 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Upload New CV
            </Link>
          </div>

          {/* Search */}
          <div className="relative mb-6 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">
              search
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-container-low border-none rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              placeholder="Search by name or filename…"
            />
          </div>

          {/* Table */}
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-container">
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                    Candidate
                  </th>
                  <th className="px-4 py-4 text-left text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                    Status
                  </th>
                  <th className="px-4 py-4 text-center text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                    Skills
                  </th>
                  <th className="px-4 py-4 text-center text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                    Publications
                  </th>
                  <th className="px-4 py-4 text-center text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                    Missing
                  </th>
                  <th className="px-4 py-4 text-right text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                    Score
                  </th>
                  <th className="px-4 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-on-surface-variant"
                    >
                      <span className="material-symbols-outlined animate-spin text-primary">
                        refresh
                      </span>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-on-surface-variant"
                    >
                      <span className="block text-3xl mb-2">📂</span>
                      No candidates found.{" "}
                      <Link href="/" className="text-primary underline">
                        Upload CVs
                      </Link>
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-surface-container-low transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-bold text-xs">
                            {(c.name || "U").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-on-surface text-sm">
                              {c.name || "(Parsing…)"}
                            </p>
                            <p className="text-[11px] text-on-surface-variant">
                              {c.filename}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${STATUS_COLORS[c.processing_status] ?? "bg-slate-100 text-slate-600"}`}
                        >
                          {c.processing_status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-on-surface">
                        {c.skills_count}
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-on-surface">
                        {c.publications_count}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {c.missing_fields_count > 0 ? (
                          <span className="text-[10px] bg-error-container text-on-error-container font-bold px-2 py-1 rounded-full">
                            {c.missing_fields_count}
                          </span>
                        ) : (
                          <span className="text-emerald-600 material-symbols-outlined text-sm">
                            check_circle
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {c.overall_score != null ? (
                          <span className="text-sm font-bold text-primary">
                            {c.overall_score}
                          </span>
                        ) : (
                          <span className="text-on-surface-variant text-xs">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/candidates/${c.id}`}
                          className="text-xs text-primary font-semibold hover:underline"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
