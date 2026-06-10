"use client";

import Sidebar from "@/components/ui/Sidebar";
import TopBar from "@/components/ui/TopBar";
import { api } from "@/lib/api";
import { CandidateListItem } from "@/lib/types";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const STATUS_COLORS: Record<string, string> = {
  done: "bg-emerald-100 text-emerald-700",
  processing: "bg-amber-100 text-amber-700",
  pending: "bg-slate-100 text-slate-600",
  failed: "bg-error-container text-on-error-container",
};

function CandidatesContent() {
  const [candidates, setCandidates] = useState<CandidateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    api
      .getCandidates(0, 100)
      .then(setCandidates)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const openDeleteModal = (id: string) => {
    setSelectedId(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedId) return;

    try {
      setDeletingId(selectedId);

      await api.deleteCandidate(selectedId);

      setCandidates((prev) => prev.filter((c) => c.id !== selectedId));

      setDeleteModalOpen(false);
      setSelectedId(null);
    } catch (err) {
      console.error(err);
      alert("Failed to delete candidate");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = candidates.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.filename.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="ml-[220px] flex-1">
        <TopBar searchValue={search} onSearchChange={setSearch} />
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
                  <th className="px-4 py-4 text-center text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                    Edu
                  </th>
                  <th className="px-4 py-4 text-center text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                    Exp
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
                      colSpan={9}
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
                      colSpan={9}
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
                      <td className="px-4 py-4 text-center">
                        {c.education_score != null ? (
                          <span
                            className={`text-xs font-bold ${c.education_score >= 70 ? "text-emerald-600" : c.education_score >= 40 ? "text-amber-600" : "text-on-surface-variant"}`}
                          >
                            {c.education_score}
                          </span>
                        ) : (
                          <span className="text-on-surface-variant text-xs">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {c.experience_score != null ? (
                          <span
                            className={`text-xs font-bold ${c.experience_score >= 70 ? "text-emerald-600" : c.experience_score >= 40 ? "text-amber-600" : "text-on-surface-variant"}`}
                          >
                            {c.experience_score}
                          </span>
                        ) : (
                          <span className="text-on-surface-variant text-xs">
                            —
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
                        <div className="flex justify-end">
                          <div className="flex items-center gap-1 bg-surface-container rounded-xl p-1">
                            {/* View */}
                            <Link
                              href={`/candidates/${c.id}`}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary hover:bg-surface-container-high transition"
                            >
                              <span className="material-symbols-outlined text-sm">
                                visibility
                              </span>
                              View
                            </Link>

                            {/* Divider */}
                            <div className="w-px h-5 bg-surface-container-high" />

                            {/* Delete */}
                            <button
                              onClick={() => openDeleteModal(c.id)}
                              disabled={deletingId === c.id}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition
          ${
            deletingId === c.id
              ? "text-slate-400 cursor-not-allowed"
              : "text-red-500 hover:bg-error-container/20"
          }`}
                            >
                              <span className="material-symbols-outlined text-sm">
                                delete
                              </span>
                              {deletingId === c.id ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDeleteModalOpen(false)}
          />

          {/* modal */}
          <div className="relative w-full max-w-md mx-4 rounded-2xl bg-surface-container-lowest shadow-2xl border border-surface-container overflow-hidden">
            <div className="p-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-error-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-error-container">
                    warning
                  </span>
                </div>

                <div>
                  <h2 className="text-lg font-bold text-on-surface">
                    Delete Candidate
                  </h2>
                  <p className="text-sm text-on-surface-variant mt-1">
                    This action cannot be undone. The candidate will be
                    permanently removed.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-surface-container text-on-surface hover:bg-surface-container-high"
                >
                  Cancel
                </button>

                <button
                  onClick={confirmDelete}
                  disabled={!!deletingId}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-error-container text-on-error-container hover:opacity-90 disabled:opacity-50"
                >
                  {deletingId ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CandidatesPage() {
  return (
    <Suspense>
      <CandidatesContent />
    </Suspense>
  );
}
