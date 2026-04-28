"use client";

import Sidebar from "@/components/ui/Sidebar";
import TopBar from "@/components/ui/TopBar";
import { api } from "@/lib/api";
import { CandidateFull, CandidateListItem } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";

// Colour palette for multi-candidate comparison (up to 3)
const CANDIDATE_COLORS = [
  { bar: "bg-primary", text: "text-primary", border: "border-primary" },
  {
    bar: "bg-emerald-500",
    text: "text-emerald-600",
    border: "border-emerald-500",
  },
  {
    bar: "bg-violet-500",
    text: "text-violet-600",
    border: "border-violet-500",
  },
];

function ScoreBar({
  score,
  colorClass,
}: {
  score: number | null | undefined;
  colorClass: string;
}) {
  const pct = score ?? 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-surface-container overflow-hidden">
        <div
          className={`h-full rounded-full ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-bold w-8 text-right">{score ?? "—"}</span>
    </div>
  );
}

function SkillBadge({
  skill,
  highlight,
}: {
  skill: string;
  highlight?: boolean;
}) {
  return (
    <span
      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
        highlight
          ? "bg-primary-fixed text-on-primary-fixed"
          : "bg-surface-container text-on-surface-variant"
      }`}
    >
      {skill}
    </span>
  );
}

export default function ComparePage() {
  const [candidates, setCandidates] = useState<CandidateListItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [details, setDetails] = useState<CandidateFull[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getCandidates(0, 100).then(setCandidates).catch(console.error);
  }, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 3
          ? [...prev, id]
          : prev,
    );
  };

  const compare = async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        selected.map((id) => api.getCandidate(id)),
      );
      setDetails(results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Derive the union of all skills across compared candidates
  const allSkills =
    details.length > 0
      ? Array.from(new Set(details.flatMap((c) => c.skills)))
      : [];

  // Shared skills = appear in every candidate
  const sharedSkills = allSkills.filter((s) =>
    details.every((c) => c.skills.includes(s)),
  );

  // Get highest education level label from a candidate
  const highestEdu = (c: CandidateFull) => {
    const order = [
      "phd",
      "pg",
      "masters",
      "ms",
      "mphil",
      "ug",
      "bachelors",
      "bs",
      "be",
      "hssc",
      "sse",
      "intermediate",
      "matric",
    ];
    const lv = c.education
      .map((e) => e.level?.toLowerCase() ?? "")
      .sort((a, b) => order.indexOf(a) - order.indexOf(b))[0];
    return lv ? lv.toUpperCase() : "—";
  };

  const totalExpYears = (c: CandidateFull) => {
    const yrs = c.experience_analysis?.total_experience_years;
    return yrs != null
      ? `${yrs.toFixed(1)} yrs`
      : `${c.experience.length} records`;
  };

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="ml-[220px] flex-1">
        <TopBar />
        <div className="pt-24 px-8 pb-12">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-on-surface">
              Compare Candidates
            </h1>
            <p className="text-on-surface-variant mt-1 text-sm">
              Select up to 3 candidates for side-by-side comparison
            </p>
          </div>

          {details.length === 0 ? (
            <>
              <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden mb-6">
                <table className="w-full">
                  <thead>
                    <tr className="bg-surface-container">
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-on-surface-variant uppercase tracking-widest w-10"></th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                        Candidate
                      </th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                        Edu Level
                      </th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                        Skills
                      </th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                        Publications
                      </th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                        Missing
                      </th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                        Score
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates
                      .filter((c) => c.processing_status === "done")
                      .map((c) => (
                        <tr
                          key={c.id}
                          className={`hover:bg-surface-container-low transition-colors border-b border-outline-variant/10 ${selected.includes(c.id) ? "bg-primary-fixed/10" : ""}`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selected.includes(c.id)}
                              onChange={() => toggleSelect(c.id)}
                              className="accent-primary w-4 h-4"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-on-surface">
                            {c.name || c.filename}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-[10px] bg-surface-container px-2 py-0.5 rounded-full text-on-surface-variant font-medium">
                              {c.edu_level || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-sm">
                            {c.skills_count}
                          </td>
                          <td className="px-4 py-3 text-center text-sm">
                            {c.publications_count}
                          </td>
                          <td className="px-4 py-3 text-center text-sm">
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
                          <td className="px-4 py-3 text-center text-sm text-primary font-bold">
                            {c.overall_score ?? "—"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {selected.length > 0 && (
                <p className="text-xs text-on-surface-variant mb-3">
                  {selected.length} candidate{selected.length > 1 ? "s" : ""}{" "}
                  selected
                  {selected.length < 2 ? " — select at least 2 to compare" : ""}
                </p>
              )}
              <button
                onClick={compare}
                disabled={selected.length < 2 || loading}
                className="primary-gradient text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-lg disabled:opacity-50"
              >
                {loading ? "Loading…" : `Compare ${selected.length} Candidates`}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setDetails([]);
                  setSelected([]);
                }}
                className="text-sm text-on-surface-variant hover:text-primary mb-6 flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">
                  arrow_back
                </span>{" "}
                Back to selection
              </button>

              {/* ── Score comparison section ─────────────────────────────── */}
              <section className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm mb-6">
                <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-5">
                  Score Comparison
                </h2>
                <div className="space-y-5">
                  {(
                    [
                      "Overall Score",
                      "Education Score",
                      "Experience Score",
                      "Research Score",
                    ] as const
                  ).map((label) => (
                    <div key={label}>
                      <p className="text-xs text-on-surface-variant mb-2 font-semibold">
                        {label}
                      </p>
                      <div className="space-y-2">
                        {details.map((c, i) => {
                          const scoreMap = {
                            "Overall Score": c.overall_score,
                            "Education Score":
                              c.education_analysis?.education_score,
                            "Experience Score":
                              c.experience_analysis?.experience_score,
                            "Research Score":
                              c.research_profile?.research_score,
                          };
                          return (
                            <div key={c.id} className="flex items-center gap-3">
                              <span
                                className={`text-[10px] font-bold w-28 truncate ${CANDIDATE_COLORS[i].text}`}
                              >
                                {c.personal_info.name || c.filename}
                              </span>
                              <ScoreBar
                                score={scoreMap[label]}
                                colorClass={CANDIDATE_COLORS[i].bar}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── Side-by-side cards ───────────────────────────────────── */}
              <div
                className="grid gap-6"
                style={{
                  gridTemplateColumns: `repeat(${details.length}, 1fr)`,
                }}
              >
                {details.map((c, i) => (
                  <div
                    key={c.id}
                    className={`bg-surface-container-lowest rounded-2xl p-6 shadow-sm space-y-5 border-t-4 ${CANDIDATE_COLORS[i].border}`}
                  >
                    {/* Header */}
                    <div className="text-center">
                      <div
                        className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-3 bg-primary-fixed text-on-primary-fixed`}
                      >
                        {(c.personal_info.name || "U").charAt(0).toUpperCase()}
                      </div>
                      <h3 className="font-bold text-on-surface text-base">
                        {c.personal_info.name || c.filename}
                      </h3>
                      <p className="text-xs text-on-surface-variant">
                        {c.personal_info.email || "—"}
                      </p>
                    </div>

                    {/* Quick stats */}
                    <div className="space-y-2 text-sm divide-y divide-outline-variant/20">
                      {[
                        { label: "Highest Degree", value: highestEdu(c) },
                        { label: "Experience", value: totalExpYears(c) },
                        { label: "Publications", value: c.publications.length },
                        { label: "Skills", value: c.skills.length },
                        {
                          label: "Career Trajectory",
                          value:
                            c.experience_analysis?.career_trajectory ?? "—",
                        },
                      ].map(({ label, value }) => (
                        <div
                          key={label}
                          className="flex justify-between py-1.5 first:pt-0"
                        >
                          <span className="text-on-surface-variant">
                            {label}
                          </span>
                          <span className="font-semibold text-on-surface capitalize">
                            {value}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between py-1.5">
                        <span className="text-on-surface-variant">
                          Missing Fields
                        </span>
                        <span
                          className={
                            c.missing_fields.length > 0
                              ? "font-semibold text-error"
                              : "font-semibold text-emerald-600"
                          }
                        >
                          {c.missing_fields.length === 0
                            ? "✓ Complete"
                            : `${c.missing_fields.length} missing`}
                        </span>
                      </div>
                    </div>

                    {/* Education records */}
                    {c.education.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                          Education
                        </p>
                        <ul className="space-y-1.5">
                          {c.education.slice(0, 3).map((e, idx) => (
                            <li key={idx} className="text-xs text-on-surface">
                              <span className="font-semibold">
                                {e.level?.toUpperCase() ?? "—"}
                              </span>
                              {e.specialization ? ` · ${e.specialization}` : ""}
                              <span className="text-on-surface-variant block truncate">
                                {e.institution}
                              </span>
                            </li>
                          ))}
                          {c.education.length > 3 && (
                            <li className="text-xs text-on-surface-variant">
                              +{c.education.length - 3} more
                            </li>
                          )}
                        </ul>
                      </div>
                    )}

                    {/* Education analysis gaps */}
                    {(c.education_analysis?.education_gaps ?? []).length >
                      0 && (
                      <div>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                          Education Gaps
                        </p>
                        <ul className="space-y-1">
                          {c
                            .education_analysis!.education_gaps.slice(0, 2)
                            .map((g, idx) => (
                              <li
                                key={idx}
                                className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1"
                              >
                                {g.justification
                                  ? `${g.gap_years ?? "?"} yr gap — ${g.justification}`
                                  : `${g.gap_years ?? "?"} yr gap between ${g.from_level} → ${g.to_level}`}
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}

                    {/* Missing fields */}
                    {c.missing_fields.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-error uppercase tracking-widest mb-1">
                          Missing Info
                        </p>
                        <ul className="flex flex-wrap gap-1">
                          {c.missing_fields.slice(0, 5).map((f) => (
                            <li
                              key={f}
                              className="text-[10px] bg-error/10 text-error px-2 py-0.5 rounded-full"
                            >
                              {f}
                            </li>
                          ))}
                          {c.missing_fields.length > 5 && (
                            <li className="text-[10px] text-on-surface-variant">
                              +{c.missing_fields.length - 5}
                            </li>
                          )}
                        </ul>
                      </div>
                    )}

                    {/* AI summary excerpt */}
                    {c.summary && (
                      <div>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                          Summary
                        </p>
                        <p className="text-xs text-on-surface leading-relaxed line-clamp-4">
                          {c.summary}
                        </p>
                      </div>
                    )}

                    <Link
                      href={`/candidates/${c.id}`}
                      className="block text-center text-xs text-primary font-semibold hover:underline"
                    >
                      View Full Profile →
                    </Link>
                  </div>
                ))}
              </div>

              {/* ── Skills comparison ────────────────────────────────────── */}
              {allSkills.length > 0 && (
                <section className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm mt-6">
                  <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                    Skills Comparison
                  </h2>
                  <p className="text-xs text-on-surface-variant mb-4">
                    Highlighted skills are shared by all candidates
                  </p>
                  <div
                    className="grid gap-4"
                    style={{
                      gridTemplateColumns: `repeat(${details.length}, 1fr)`,
                    }}
                  >
                    {details.map((c) => (
                      <div key={c.id}>
                        <p className="text-xs font-semibold text-on-surface mb-2 truncate">
                          {c.personal_info.name || c.filename}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {c.skills.slice(0, 20).map((s) => (
                            <SkillBadge
                              key={s}
                              skill={s}
                              highlight={sharedSkills.includes(s)}
                            />
                          ))}
                          {c.skills.length > 20 && (
                            <span className="text-[10px] text-on-surface-variant">
                              +{c.skills.length - 20} more
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
