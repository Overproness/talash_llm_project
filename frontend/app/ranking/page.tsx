"use client";

import Sidebar from "@/components/ui/Sidebar";
import TopBar from "@/components/ui/TopBar";
import { api } from "@/lib/api";
import { RankedCandidate } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";

const MEDAL_STYLES = [
  {
    bg: "bg-gradient-to-br from-amber-300 to-amber-500",
    ring: "ring-amber-400",
    label: "Gold",
    icon: "emoji_events",
  },
  {
    bg: "bg-gradient-to-br from-slate-300 to-slate-500",
    ring: "ring-slate-400",
    label: "Silver",
    icon: "workspace_premium",
  },
  {
    bg: "bg-gradient-to-br from-orange-300 to-orange-600",
    ring: "ring-orange-500",
    label: "Bronze",
    icon: "military_tech",
  },
];

function ScoreCell({
  value,
  color = "text-on-surface",
}: {
  value: number | null;
  color?: string;
}) {
  if (value == null) return <span className="text-outline text-xs">—</span>;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-surface-container min-w-[40px]">
        <div
          className={`h-full rounded-full ${color.replace("text-", "bg-")}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className={`text-xs font-bold w-8 text-right ${color}`}>
        {value}
      </span>
    </div>
  );
}

export default function RankingPage() {
  const [rankings, setRankings] = useState<RankedCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [minScore, setMinScore] = useState(0);
  const [limit, setLimit] = useState(50);

  const load = () => {
    setLoading(true);
    api
      .rankCandidates(limit, minScore)
      .then((r) => setRankings(r.rankings))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const top3 = rankings.slice(0, 3);

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="ml-[220px] flex-1">
        <TopBar />
        <div className="pt-24 px-8 pb-12">
          {/* Header */}
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-on-surface flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-4xl">
                  leaderboard
                </span>
                Candidate Rankings
              </h1>
              <p className="text-on-surface-variant mt-1 text-sm">
                Quantifiable, evidence-based ranking using weighted scores
                across education, experience, research, and completeness.
              </p>
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface-variant text-xs font-semibold hover:bg-surface-container-low disabled:opacity-50 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">
                refresh
              </span>
              Refresh
            </button>
          </div>

          {/* Filter controls */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm mb-8 grid grid-cols-3 gap-6 items-end">
            <div>
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">
                Minimum Overall Score: {minScore}
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">
                Show Top
              </label>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm"
              >
                <option value={10}>10 candidates</option>
                <option value={25}>25 candidates</option>
                <option value={50}>50 candidates</option>
                <option value={100}>100 candidates</option>
                <option value={200}>200 candidates</option>
              </select>
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="primary-gradient text-white px-5 py-2.5 rounded-lg font-semibold text-sm shadow-md disabled:opacity-50"
            >
              Apply Filters
            </button>
          </div>

          {/* Loading / empty */}
          {loading ? (
            <div className="bg-surface-container-lowest rounded-2xl p-12 text-center shadow-sm">
              <span className="material-symbols-outlined text-4xl animate-spin text-primary">
                refresh
              </span>
              <p className="text-sm text-on-surface-variant mt-3">
                Computing rankings…
              </p>
            </div>
          ) : rankings.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-2xl p-12 text-center shadow-sm">
              <span className="material-symbols-outlined text-4xl text-outline mb-3 block">
                inbox
              </span>
              <h3 className="font-semibold text-on-surface mb-1">
                No ranked candidates yet
              </h3>
              <p className="text-sm text-on-surface-variant mb-4">
                Upload CVs and run analysis to populate rankings.
              </p>
              <Link
                href="/"
                className="inline-block primary-gradient text-white px-5 py-2 rounded-lg text-sm font-semibold"
              >
                Upload CVs
              </Link>
            </div>
          ) : (
            <>
              {/* Podium / Top 3 */}
              {top3.length > 0 && (
                <div className="grid grid-cols-3 gap-6 mb-8">
                  {top3.map((c, i) => {
                    const m = MEDAL_STYLES[i];
                    return (
                      <Link
                        key={c.id}
                        href={`/candidates/${c.id}`}
                        className={`relative bg-surface-container-lowest rounded-2xl p-6 shadow-md ring-2 ${m.ring} hover:shadow-xl transition-shadow group`}
                      >
                        <div
                          className={`absolute -top-4 -left-4 w-12 h-12 rounded-full ${m.bg} flex items-center justify-center shadow-lg text-white`}
                        >
                          <span className="material-symbols-outlined text-2xl">
                            {m.icon}
                          </span>
                        </div>
                        <div className="absolute top-4 right-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                          #{c.rank_position} · {m.label}
                        </div>
                        <div className="mt-6 mb-4">
                          <h3 className="font-bold text-lg text-on-surface truncate group-hover:text-primary">
                            {c.name}
                          </h3>
                          {c.edu_level && (
                            <p className="text-xs text-on-surface-variant capitalize">
                              {c.edu_level}
                            </p>
                          )}
                        </div>
                        <div className="text-center mb-4">
                          <span className="text-[10px] text-outline uppercase tracking-widest">
                            Overall Score
                          </span>
                          <div className="text-5xl font-extrabold text-primary leading-none mt-1">
                            {c.overall_score?.toFixed(1) ?? "—"}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-surface-container rounded-lg py-2">
                            <span className="text-[9px] text-outline uppercase block">
                              Edu
                            </span>
                            <span className="text-sm font-bold text-emerald-600">
                              {c.education_score?.toFixed(0) ?? "—"}
                            </span>
                          </div>
                          <div className="bg-surface-container rounded-lg py-2">
                            <span className="text-[9px] text-outline uppercase block">
                              Exp
                            </span>
                            <span className="text-sm font-bold text-blue-600">
                              {c.experience_score?.toFixed(0) ?? "—"}
                            </span>
                          </div>
                          <div className="bg-surface-container rounded-lg py-2">
                            <span className="text-[9px] text-outline uppercase block">
                              Res
                            </span>
                            <span className="text-sm font-bold text-violet-600">
                              {c.research_score?.toFixed(0) ?? "—"}
                            </span>
                          </div>
                        </div>
                        {c.primary_research_areas.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-1">
                            {c.primary_research_areas
                              .slice(0, 3)
                              .map((a, j) => (
                                <span
                                  key={j}
                                  className="text-[10px] bg-primary-fixed text-on-primary-fixed px-2 py-0.5 rounded-full capitalize"
                                >
                                  {a}
                                </span>
                              ))}
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Full ranked table */}
              <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest">
                    Full Ranking ({rankings.length})
                  </h2>
                  <span className="text-xs text-on-surface-variant">
                    Sorted by overall score (descending)
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-container">
                      <th className="text-left px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest w-16">
                        Rank
                      </th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                        Candidate
                      </th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest w-44">
                        Overall
                      </th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest w-32">
                        Edu
                      </th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest w-32">
                        Exp
                      </th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest w-32">
                        Research
                      </th>
                      <th className="text-center px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                        Pubs
                      </th>
                      <th className="text-center px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                        Skills
                      </th>
                      <th className="text-center px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                        Missing
                      </th>
                      <th className="px-4 py-3 w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.map((c) => {
                      const isPodium = c.rank_position <= 3;
                      return (
                        <tr
                          key={c.id}
                          className={`border-t border-outline-variant/10 hover:bg-surface-container-low transition-colors ${
                            isPodium ? "bg-amber-50/30" : ""
                          }`}
                        >
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                                c.rank_position === 1
                                  ? "bg-amber-200 text-amber-900"
                                  : c.rank_position === 2
                                    ? "bg-slate-200 text-slate-700"
                                    : c.rank_position === 3
                                      ? "bg-orange-200 text-orange-800"
                                      : "bg-surface-container text-on-surface-variant"
                              }`}
                            >
                              {c.rank_position}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/candidates/${c.id}`}
                              className="font-semibold text-on-surface hover:text-primary"
                            >
                              {c.name}
                            </Link>
                            {c.edu_level && (
                              <p className="text-[11px] text-on-surface-variant capitalize">
                                {c.edu_level}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <ScoreCell
                              value={c.overall_score}
                              color="text-primary"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <ScoreCell
                              value={c.education_score}
                              color="text-emerald-600"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <ScoreCell
                              value={c.experience_score}
                              color="text-blue-600"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <ScoreCell
                              value={c.research_score}
                              color="text-violet-600"
                            />
                          </td>
                          <td className="px-4 py-3 text-center text-on-surface">
                            {c.publications_count}
                          </td>
                          <td className="px-4 py-3 text-center text-on-surface">
                            {c.skills_count}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={
                                c.missing_fields_count > 0
                                  ? "text-error font-semibold"
                                  : "text-emerald-600 font-semibold"
                              }
                            >
                              {c.missing_fields_count}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/candidates/${c.id}`}
                              className="text-xs text-primary font-semibold hover:underline"
                            >
                              View →
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Methodology footnote */}
              <div className="mt-6 bg-surface-container-lowest rounded-xl p-5 text-xs text-on-surface-variant leading-relaxed">
                <p className="font-bold text-on-surface mb-2 text-[11px] uppercase tracking-widest">
                  Ranking Methodology
                </p>
                <p>
                  Overall scores are weighted composites:{" "}
                  <strong className="text-emerald-600">Education 30%</strong>,{" "}
                  <strong className="text-violet-600">
                    Research Quality 30%
                  </strong>
                  , <strong className="text-blue-600">Experience 25%</strong>,
                  Skills 5%, and Profile Completeness 10%. Research scores
                  factor in journal quartiles (Q1/Q2), CORE conference rankings
                  (A*/A), Scopus indexing, authorship roles, topic variability,
                  and co-author collaboration patterns.
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
