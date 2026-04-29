"use client";

import Sidebar from "@/components/ui/Sidebar";
import TopBar from "@/components/ui/TopBar";
import { api } from "@/lib/api";
import { CandidateFull } from "@/lib/types";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Tab =
  | "overview"
  | "education"
  | "experience"
  | "publications"
  | "portfolio"
  | "skills"
  | "analysis"
  | "raw";

export default function CandidateProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [candidate, setCandidate] = useState<CandidateFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    if (!id) return;
    api
      .getCandidate(id)
      .then(setCandidate)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleReanalyze = async () => {
    if (!id) return;
    setAnalyzing(true);
    try {
      await api.analyzeCandidate(id);
      const updated = await api.getCandidate(id);
      setCandidate(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading)
    return (
      <div className="flex min-h-screen bg-surface">
        <Sidebar />
        <main className="ml-[220px] flex-1 flex items-center justify-center">
          <span className="material-symbols-outlined animate-spin text-primary text-4xl">
            refresh
          </span>
        </main>
      </div>
    );

  if (!candidate)
    return (
      <div className="flex min-h-screen bg-surface">
        <Sidebar />
        <main className="ml-[220px] flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-on-surface-variant mb-4">Candidate not found.</p>
            <Link href="/candidates" className="text-primary underline">
              ← Back
            </Link>
          </div>
        </main>
      </div>
    );

  const pi = candidate.personal_info;
  const initials = pi.name
    ? pi.name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : candidate.filename.slice(0, 2).toUpperCase();

  const eduAnalysis = candidate.education_analysis;
  const expAnalysis = candidate.experience_analysis;
  const researchSummary = candidate.research_summary;
  const researchProfile = candidate.research_profile;

  // Find the current/most-recent role: prefer one whose end_date is "present"
  const _PRESENT_TOKENS = [
    "present",
    "current",
    "ongoing",
    "till date",
    "to date",
    "",
  ];
  const _isUnemployed = /unemployed|not\s+employed|not\s+applicable/i.test(
    pi.present_employment ?? "",
  );
  const currentExp = _isUnemployed
    ? null
    : (candidate.experience.find((e) =>
        _PRESENT_TOKENS.includes((e.end_date ?? "").trim().toLowerCase()),
      ) ??
      (candidate.experience.length > 0
        ? [...candidate.experience].sort((a, b) => {
            const yr = (d: string) => {
              const m = d.match(/(19|20)\d{2}/);
              return m ? parseInt(m[0]) : 0;
            };
            return yr(b.start_date) - yr(a.start_date);
          })[0]
        : null));

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "overview", label: "Overview", icon: "dashboard" },
    { key: "education", label: "Education", icon: "school" },
    { key: "experience", label: "Experience", icon: "work" },
    { key: "publications", label: "Publications", icon: "article" },
    { key: "portfolio", label: "Portfolio", icon: "collections_bookmark" },
    { key: "skills", label: "Skills", icon: "psychology" },
    { key: "analysis", label: "Analysis", icon: "analytics" },
    { key: "raw", label: "Raw CV", icon: "description" },
  ];

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="ml-[220px] flex-1">
        <TopBar
          breadcrumb={["TALASH", "Candidates", pi.name || candidate.filename]}
        />
        <div className="pt-24 px-10 pb-12 space-y-8">
          {/* Missing info banner */}
          {candidate.missing_fields.length > 0 && (
            <div className="bg-tertiary-fixed text-on-tertiary-fixed px-6 py-3 rounded-xl flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined">warning</span>
                <span className="font-medium">
                  Missing information detected —{" "}
                  {candidate.missing_fields.length} field(s) incomplete
                </span>
              </div>
              <Link
                href="/email-drafts"
                className="text-on-tertiary-fixed-variant font-bold underline decoration-2 underline-offset-4"
              >
                View Email Draft
              </Link>
            </div>
          )}

          {/* Profile header */}
          <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm flex items-start justify-between">
            <div className="flex gap-6">
              <div className="w-20 h-20 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed text-2xl font-bold flex-shrink-0">
                {initials}
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-on-surface">
                  {pi.name || candidate.filename}
                </h1>
                {_isUnemployed ? (
                  <p className="text-on-surface-variant text-sm">Unemployed</p>
                ) : currentExp ? (
                  <p className="text-on-surface-variant text-sm">
                    {currentExp.title} • {currentExp.organization}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-4 text-xs text-outline mt-2">
                  {pi.email && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">
                        mail
                      </span>
                      {pi.email}
                    </span>
                  )}
                  {pi.phone && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">
                        call
                      </span>
                      {pi.phone}
                    </span>
                  )}
                  {pi.location && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">
                        location_on
                      </span>
                      {pi.location}
                    </span>
                  )}
                </div>
                <div className="flex gap-2 mt-2">
                  <span className="text-[10px] bg-primary-fixed text-on-primary-fixed px-2 py-1 rounded-full font-bold">
                    {candidate.extraction_method === "llm"
                      ? "LLM Extracted"
                      : "Rule-based"}
                  </span>
                  <span className="text-[10px] bg-surface-container text-on-surface-variant px-2 py-1 rounded-full">
                    {candidate.education.length} education records
                  </span>
                  <span className="text-[10px] bg-surface-container text-on-surface-variant px-2 py-1 rounded-full">
                    {candidate.publications.length} publications
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-4">
              {candidate.overall_score != null && (
                <div className="text-right">
                  <span className="block text-[10px] text-outline uppercase tracking-widest">
                    Overall Score
                  </span>
                  <span className="text-5xl font-bold text-primary">
                    {candidate.overall_score}
                  </span>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleReanalyze}
                  disabled={analyzing}
                  className="px-5 py-2 rounded-lg border border-outline-variant text-on-surface-variant font-semibold text-sm hover:bg-surface-container-low transition-all disabled:opacity-50"
                >
                  {analyzing ? "Analyzing..." : "Re-analyze"}
                </button>
                <Link
                  href="/email-drafts"
                  className="px-5 py-2 rounded-lg primary-gradient text-white font-semibold text-sm shadow-md inline-flex items-center"
                >
                  Draft Email
                </Link>
              </div>
            </div>
          </section>

          {/* Summary */}
          {candidate.summary && (
            <section className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm">
              <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">
                Candidate Summary
              </h3>
              <p className="text-sm text-on-surface leading-relaxed">
                {candidate.summary}
              </p>
            </section>
          )}

          {/* Score cards row */}
          {(eduAnalysis?.education_score != null ||
            expAnalysis?.experience_score != null) && (
            <div className="grid grid-cols-4 gap-4">
              {candidate.overall_score != null && (
                <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm">
                  <span className="text-[10px] text-outline uppercase tracking-widest">
                    Overall
                  </span>
                  <div className="text-3xl font-bold text-primary mt-1">
                    {candidate.overall_score}
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-surface-container mt-3">
                    <div
                      className="h-full rounded-full primary-gradient"
                      style={{ width: `${candidate.overall_score}%` }}
                    />
                  </div>
                </div>
              )}
              {eduAnalysis?.education_score != null && (
                <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm">
                  <span className="text-[10px] text-outline uppercase tracking-widest">
                    Education
                  </span>
                  <div className="text-3xl font-bold text-emerald-600 mt-1">
                    {eduAnalysis.education_score}
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-surface-container mt-3">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${eduAnalysis.education_score}%` }}
                    />
                  </div>
                </div>
              )}
              {expAnalysis?.experience_score != null && (
                <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm">
                  <span className="text-[10px] text-outline uppercase tracking-widest">
                    Experience
                  </span>
                  <div className="text-3xl font-bold text-blue-600 mt-1">
                    {expAnalysis.experience_score}
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-surface-container mt-3">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${expAnalysis.experience_score}%` }}
                    />
                  </div>
                </div>
              )}
              {(researchSummary || researchProfile) &&
                (researchSummary?.total_publications ??
                  researchProfile?.total_publications ??
                  0) > 0 && (
                  <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm">
                    <span className="text-[10px] text-outline uppercase tracking-widest">
                      Publications
                    </span>
                    <div className="text-3xl font-bold text-violet-600 mt-1">
                      {researchProfile?.total_publications ??
                        researchSummary?.total_publications}
                    </div>
                    <p className="text-[10px] text-on-surface-variant mt-1">
                      {researchProfile?.journal_count ??
                        researchSummary?.journal_count}
                      J /{" "}
                      {researchProfile?.conference_count ??
                        researchSummary?.conference_count}
                      C
                    </p>
                  </div>
                )}
              {researchProfile?.research_score != null && (
                <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm">
                  <span className="text-[10px] text-outline uppercase tracking-widest">
                    Research Score
                  </span>
                  <div className="text-3xl font-bold text-violet-600 mt-1">
                    {researchProfile.research_score}
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-surface-container mt-3">
                    <div
                      className="h-full rounded-full bg-violet-500"
                      style={{ width: `${researchProfile.research_score}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab nav */}
          <nav className="flex gap-6 border-b border-outline-variant/20">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`pb-4 font-medium text-sm transition-colors flex items-center gap-2 ${
                  tab === t.key
                    ? "text-primary border-b-2 border-primary -mb-px font-bold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-base">
                  {t.icon}
                </span>
                {t.label}
              </button>
            ))}
          </nav>

          {/* Tab content */}
          {tab === "overview" && (
            <div className="grid grid-cols-3 gap-6">
              {/* Quick stats */}
              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
                <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">
                  Profile Summary
                </h3>
                <div className="space-y-3">
                  {[
                    {
                      label: "Education Records",
                      value: candidate.education.length,
                    },
                    {
                      label: "Experience Records",
                      value: candidate.experience.length,
                    },
                    {
                      label: "Publications",
                      value: candidate.publications.length,
                    },
                    { label: "Skills", value: candidate.skills.length },
                    { label: "Books", value: candidate.books.length },
                    { label: "Patents", value: candidate.patents.length },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-on-surface-variant">
                        {item.label}
                      </span>
                      <span className="font-semibold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Missing fields */}
              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
                <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">
                  Missing Fields
                </h3>
                {candidate.missing_fields.length === 0 ? (
                  <p className="text-sm text-emerald-600 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">
                      check_circle
                    </span>
                    No missing fields detected
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {candidate.missing_fields.slice(0, 8).map((f, i) => (
                      <li
                        key={i}
                        className="text-xs text-on-surface-variant flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-error text-sm">
                          info
                        </span>
                        {f}
                      </li>
                    ))}
                    {candidate.missing_fields.length > 8 && (
                      <li className="text-xs text-outline">
                        +{candidate.missing_fields.length - 8} more
                      </li>
                    )}
                  </ul>
                )}
              </div>

              {/* Skills cloud */}
              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
                <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">
                  Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {candidate.skills.slice(0, 15).map((s, i) => (
                    <span
                      key={i}
                      className="text-[11px] bg-primary-fixed text-on-primary-fixed px-2 py-1 rounded-full font-medium"
                    >
                      {s}
                    </span>
                  ))}
                  {candidate.skills.length === 0 && (
                    <p className="text-xs text-on-surface-variant">
                      No skills extracted
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === "education" && (
            <div className="space-y-4">
              {/* Education analysis summary */}
              {eduAnalysis && (
                <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm mb-4">
                  <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">
                    Education Analysis
                  </h3>
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="bg-surface-container rounded-lg p-3">
                      <span className="text-[10px] text-outline uppercase">
                        Highest Qual.
                      </span>
                      <p className="font-bold text-on-surface">
                        {eduAnalysis.highest_qualification || "—"}
                      </p>
                    </div>
                    <div className="bg-surface-container rounded-lg p-3">
                      <span className="text-[10px] text-outline uppercase">
                        Performance
                      </span>
                      <p className="font-bold text-on-surface capitalize">
                        {eduAnalysis.performance_trend || "—"}
                      </p>
                    </div>
                    <div className="bg-surface-container rounded-lg p-3">
                      <span className="text-[10px] text-outline uppercase">
                        Specialization
                      </span>
                      <p className="font-bold text-on-surface capitalize">
                        {eduAnalysis.specialization_consistency || "—"}
                      </p>
                    </div>
                    <div className="bg-surface-container rounded-lg p-3">
                      <span className="text-[10px] text-outline uppercase">
                        Score
                      </span>
                      <p className="font-bold text-primary">
                        {eduAnalysis.education_score ?? "—"}/100
                      </p>
                    </div>
                  </div>
                  {eduAnalysis.overall_assessment && (
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      {eduAnalysis.overall_assessment}
                    </p>
                  )}
                  {/* Education gaps */}
                  {eduAnalysis.education_gaps.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                        Educational Gaps
                      </h4>
                      <div className="space-y-2">
                        {eduAnalysis.education_gaps.map((gap, i) => (
                          <div
                            key={i}
                            className={`rounded-lg p-3 text-sm ${gap.justified ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"}`}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`material-symbols-outlined text-sm ${gap.justified ? "text-emerald-600" : "text-amber-600"}`}
                              >
                                {gap.justified ? "check_circle" : "warning"}
                              </span>
                              <span className="font-medium">
                                {gap.from_level} → {gap.to_level}:{" "}
                                {gap.gap_years} year(s) gap ({gap.from_year}–
                                {gap.to_year})
                              </span>
                            </div>
                            <p className="text-xs text-on-surface-variant mt-1 ml-6">
                              {gap.justification}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Education records table */}
              {candidate.education.length === 0 ? (
                <p className="text-on-surface-variant text-sm">
                  No education records found.
                </p>
              ) : (
                <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-surface-container">
                        <th className="text-left px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                          Level
                        </th>
                        <th className="text-left px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                          Degree
                        </th>
                        <th className="text-left px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                          Institution
                        </th>
                        <th className="text-left px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                          Years
                        </th>
                        <th className="text-right px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                          Marks/CGPA
                        </th>
                        <th className="text-right px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                          Normalized
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidate.education.map((edu, i) => (
                        <tr
                          key={i}
                          className="border-t border-outline-variant/10"
                        >
                          <td className="px-5 py-3">
                            <span className="text-[10px] bg-primary-fixed text-on-primary-fixed font-bold px-2 py-0.5 rounded-full uppercase">
                              {edu.level}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <p className="font-medium text-on-surface">
                              {edu.degree}
                            </p>
                            {edu.specialization && (
                              <p className="text-xs text-on-surface-variant">
                                {edu.specialization}
                              </p>
                            )}
                          </td>
                          <td className="px-5 py-3 text-on-surface-variant">
                            {edu.institution || edu.board_or_affiliation || "—"}
                          </td>
                          <td className="px-5 py-3 text-on-surface-variant">
                            {edu.start_year ?? "?"} — {edu.end_year ?? "?"}
                          </td>
                          <td className="px-5 py-3 text-right font-medium text-on-surface">
                            {edu.marks_or_cgpa || "—"}
                          </td>
                          <td className="px-5 py-3 text-right">
                            {edu.normalized_score != null ? (
                              <span
                                className={`font-bold ${edu.normalized_score >= 70 ? "text-emerald-600" : edu.normalized_score >= 50 ? "text-amber-600" : "text-error"}`}
                              >
                                {edu.normalized_score.toFixed(1)}%
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === "experience" && (
            <div className="space-y-4">
              {/* Experience analysis summary */}
              {expAnalysis && (
                <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm mb-4">
                  <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">
                    Experience Analysis
                  </h3>
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="bg-surface-container rounded-lg p-3">
                      <span className="text-[10px] text-outline uppercase">
                        Total Years
                      </span>
                      <p className="font-bold text-on-surface">
                        {expAnalysis.total_experience_years ?? "—"}
                      </p>
                    </div>
                    <div className="bg-surface-container rounded-lg p-3">
                      <span className="text-[10px] text-outline uppercase">
                        Trajectory
                      </span>
                      <p className="font-bold text-on-surface capitalize">
                        {expAnalysis.career_trajectory || "—"}
                      </p>
                    </div>
                    <div className="bg-surface-container rounded-lg p-3">
                      <span className="text-[10px] text-outline uppercase">
                        Consistency
                      </span>
                      <p className="font-bold text-on-surface capitalize">
                        {expAnalysis.experience_consistency || "—"}
                      </p>
                    </div>
                    <div className="bg-surface-container rounded-lg p-3">
                      <span className="text-[10px] text-outline uppercase">
                        Score
                      </span>
                      <p className="font-bold text-primary">
                        {expAnalysis.experience_score ?? "—"}/100
                      </p>
                    </div>
                  </div>
                  {expAnalysis.overall_assessment && (
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      {expAnalysis.overall_assessment}
                    </p>
                  )}

                  {/* Timeline overlaps */}
                  {expAnalysis.timeline_overlaps.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                        Timeline Overlaps
                      </h4>
                      <div className="space-y-2">
                        {expAnalysis.timeline_overlaps.map((overlap, i) => (
                          <div
                            key={i}
                            className={`rounded-lg p-3 text-sm ${overlap.assessment === "legitimate" ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"}`}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`material-symbols-outlined text-sm ${overlap.assessment === "legitimate" ? "text-emerald-600" : "text-amber-600"}`}
                              >
                                {overlap.assessment === "legitimate"
                                  ? "check_circle"
                                  : "schedule"}
                              </span>
                              <span className="font-medium capitalize">
                                {overlap.type}
                              </span>
                              <span className="text-xs text-on-surface-variant">
                                — {overlap.overlap_period}
                              </span>
                            </div>
                            <p className="text-xs text-on-surface-variant mt-1 ml-6">
                              {overlap.item_a} ↔ {overlap.item_b}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Experience gaps */}
                  {expAnalysis.experience_gaps.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                        Professional Gaps
                      </h4>
                      <div className="space-y-2">
                        {expAnalysis.experience_gaps.map((gap, i) => (
                          <div
                            key={i}
                            className={`rounded-lg p-3 text-sm ${gap.justified ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"}`}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`material-symbols-outlined text-sm ${gap.justified ? "text-emerald-600" : "text-amber-600"}`}
                              >
                                {gap.justified ? "check_circle" : "warning"}
                              </span>
                              <span className="font-medium">
                                {gap.gap_months} month(s) gap
                              </span>
                              <span className="text-xs text-on-surface-variant">
                                ({gap.from_date} → {gap.to_date})
                              </span>
                            </div>
                            <p className="text-xs text-on-surface-variant mt-1 ml-6">
                              {gap.justification}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Experience records table */}
              {candidate.experience.length === 0 ? (
                <p className="text-on-surface-variant text-sm">
                  No experience records found.
                </p>
              ) : (
                <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-surface-container">
                        <th className="text-left px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                          Role
                        </th>
                        <th className="text-left px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                          Organization
                        </th>
                        <th className="text-left px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                          Type
                        </th>
                        <th className="text-left px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                          Period
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidate.experience.map((exp, i) => (
                        <tr
                          key={i}
                          className="border-t border-outline-variant/10"
                        >
                          <td className="px-5 py-3">
                            <p className="font-medium text-on-surface">
                              {exp.title}
                            </p>
                            {exp.description && (
                              <p className="text-xs text-on-surface-variant mt-1">
                                {exp.description.slice(0, 120)}
                              </p>
                            )}
                          </td>
                          <td className="px-5 py-3 text-on-surface-variant">
                            {exp.organization || "—"}
                          </td>
                          <td className="px-5 py-3">
                            {exp.employment_type && (
                              <span className="text-[10px] bg-surface-container text-on-surface-variant font-medium px-2 py-0.5 rounded-full">
                                {exp.employment_type}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-on-surface-variant whitespace-nowrap">
                            {exp.start_date} — {exp.end_date || "Present"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === "publications" && (
            <div className="space-y-3">
              {/* Research summary */}
              {researchSummary && researchSummary.total_publications > 0 && (
                <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm mb-4">
                  <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">
                    Research Profile Summary
                  </h3>
                  <div className="grid grid-cols-5 gap-4 mb-4">
                    <div className="bg-surface-container rounded-lg p-3 text-center">
                      <span className="text-2xl font-bold text-primary">
                        {researchSummary.total_publications}
                      </span>
                      <p className="text-[10px] text-outline uppercase">
                        Total
                      </p>
                    </div>
                    <div className="bg-surface-container rounded-lg p-3 text-center">
                      <span className="text-2xl font-bold text-emerald-600">
                        {researchSummary.journal_count}
                      </span>
                      <p className="text-[10px] text-outline uppercase">
                        Journal
                      </p>
                    </div>
                    <div className="bg-surface-container rounded-lg p-3 text-center">
                      <span className="text-2xl font-bold text-blue-600">
                        {researchSummary.conference_count}
                      </span>
                      <p className="text-[10px] text-outline uppercase">
                        Conference
                      </p>
                    </div>
                    <div className="bg-surface-container rounded-lg p-3 text-center">
                      <span className="text-2xl font-bold text-violet-600">
                        {researchSummary.book_chapter_count}
                      </span>
                      <p className="text-[10px] text-outline uppercase">
                        Book Ch.
                      </p>
                    </div>
                    <div className="bg-surface-container rounded-lg p-3 text-center">
                      <span className="text-sm font-bold text-on-surface">
                        {researchSummary.publication_years_range}
                      </span>
                      <p className="text-[10px] text-outline uppercase">
                        Years
                      </p>
                    </div>
                  </div>
                  {researchSummary.primary_research_areas.length > 0 && (
                    <div className="flex gap-2 flex-wrap mb-3">
                      {researchSummary.primary_research_areas.map((area, i) => (
                        <span
                          key={i}
                          className="text-[11px] bg-primary-fixed text-on-primary-fixed px-2 py-1 rounded-full font-medium capitalize"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-on-surface-variant">
                    {researchSummary.overall_assessment}
                  </p>
                </div>
              )}

              {/* Publications table */}
              {candidate.publications.length === 0 ? (
                <p className="text-on-surface-variant text-sm">
                  No publications found.
                </p>
              ) : (
                <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-surface-container">
                        <th className="text-left px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest w-16">
                          Type
                        </th>
                        <th className="text-left px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                          Title
                        </th>
                        <th className="text-left px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                          Venue
                        </th>
                        <th className="text-center px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                          Year
                        </th>
                        <th className="text-left px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                          DOI
                        </th>
                        {researchProfile && (
                          <th className="text-center px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                            Quality
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {candidate.publications.map((pub, i) => (
                        <tr
                          key={i}
                          className="border-t border-outline-variant/10"
                        >
                          <td className="px-5 py-3">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${pub.pub_type === "journal" ? "bg-primary-fixed text-on-primary-fixed" : "bg-tertiary-fixed text-on-tertiary-fixed"}`}
                            >
                              {pub.pub_type}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <p className="font-medium text-on-surface">
                              {pub.title}
                            </p>
                            {pub.authors.length > 0 && (
                              <p className="text-[11px] text-on-surface-variant mt-0.5">
                                {pub.authors.join(", ")}
                              </p>
                            )}
                          </td>
                          <td className="px-5 py-3 text-on-surface-variant text-xs">
                            {pub.venue || "—"}
                          </td>
                          <td className="px-5 py-3 text-center text-on-surface">
                            {pub.year || "—"}
                          </td>
                          <td className="px-5 py-3 text-xs text-primary">
                            {pub.doi ? (
                              <a
                                href={`https://doi.org/${pub.doi}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline hover:text-primary/70 break-all"
                              >
                                {pub.doi}
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                          {researchProfile &&
                            (() => {
                              const qi = researchProfile.publication_quality[i];
                              if (!qi) return <td className="px-5 py-3" />;
                              const qualityColors: Record<string, string> = {
                                High: "bg-emerald-100 text-emerald-800",
                                Medium: "bg-amber-100 text-amber-800",
                                Low: "bg-red-100 text-red-800",
                                Unknown:
                                  "bg-surface-container text-on-surface-variant",
                              };
                              const roleColors: Record<string, string> = {
                                first_author:
                                  "bg-primary-fixed text-on-primary-fixed",
                                sole_author:
                                  "bg-primary-fixed text-on-primary-fixed",
                                corresponding_author:
                                  "bg-blue-100 text-blue-800",
                                co_author:
                                  "bg-surface-container text-on-surface-variant",
                                first_and_corresponding:
                                  "bg-primary-fixed text-on-primary-fixed",
                                unknown:
                                  "bg-surface-container text-on-surface-variant",
                              };
                              const coreRank = qi.conference_quality?.core_rank;
                              const quartile = qi.journal_quality?.quartile;
                              return (
                                <td className="px-5 py-3">
                                  <div className="flex flex-col gap-1 items-start">
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${qualityColors[qi.quality_label] ?? qualityColors.Unknown}`}
                                    >
                                      {qi.quality_label}
                                    </span>
                                    {quartile && quartile !== "unknown" && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-800">
                                        {quartile}
                                      </span>
                                    )}
                                    {coreRank && coreRank !== "unknown" && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                                        CORE {coreRank}
                                      </span>
                                    )}
                                    {qi.authorship_role !== "unknown" && (
                                      <span
                                        className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${roleColors[qi.authorship_role] ?? roleColors.unknown}`}
                                      >
                                        {qi.authorship_role.replace(/_/g, " ")}
                                      </span>
                                    )}
                                  </div>
                                </td>
                              );
                            })()}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === "portfolio" && (
            <div className="space-y-6">
              {/* Books */}
              <section className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">
                      menu_book
                    </span>
                    Books Authored / Co-Authored
                  </h3>
                  <span className="text-xs text-on-surface-variant">
                    {candidate.books.length} record(s)
                  </span>
                </div>
                {candidate.books.length === 0 ? (
                  <p className="text-sm text-on-surface-variant px-6 py-6">
                    No books recorded.
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-surface-container">
                        <th className="text-left px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                          Title
                        </th>
                        <th className="text-left px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                          Authors
                        </th>
                        <th className="text-left px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                          Publisher
                        </th>
                        <th className="text-center px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                          Year
                        </th>
                        <th className="text-left px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                          ISBN
                        </th>
                        <th className="text-center px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                          Link
                        </th>
                        {researchProfile &&
                          researchProfile.book_quality.length > 0 && (
                            <th className="text-left px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                              Quality
                            </th>
                          )}
                      </tr>
                    </thead>
                    <tbody>
                      {candidate.books.map((b, i) => {
                        const bq = researchProfile?.book_quality?.[i];
                        return (
                          <tr
                            key={i}
                            className="border-t border-outline-variant/10"
                          >
                            <td className="px-5 py-3 font-medium text-on-surface">
                              {b.title || "—"}
                            </td>
                            <td className="px-5 py-3 text-on-surface-variant text-xs">
                              {b.authors.join(", ") || "—"}
                            </td>
                            <td className="px-5 py-3 text-on-surface-variant">
                              {b.publisher || "—"}
                            </td>
                            <td className="px-5 py-3 text-center text-on-surface">
                              {b.year ?? "—"}
                            </td>
                            <td className="px-5 py-3 text-xs text-on-surface-variant font-mono">
                              {b.isbn || "—"}
                            </td>
                            <td className="px-5 py-3 text-center">
                              {b.url ? (
                                <a
                                  href={b.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-primary hover:underline text-xs inline-flex items-center gap-1"
                                >
                                  Verify
                                  <span className="material-symbols-outlined text-xs">
                                    open_in_new
                                  </span>
                                </a>
                              ) : (
                                <span className="text-outline text-xs">—</span>
                              )}
                            </td>
                            {researchProfile &&
                              researchProfile.book_quality.length > 0 && (
                                <td className="px-5 py-3">
                                  {bq ? (
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                        bq.publisher_credibility ===
                                        "top_academic"
                                          ? "bg-emerald-100 text-emerald-800"
                                          : bq.publisher_credibility ===
                                              "reputable"
                                            ? "bg-blue-100 text-blue-800"
                                            : bq.publisher_credibility ===
                                                "predatory"
                                              ? "bg-red-100 text-red-800"
                                              : "bg-surface-container text-on-surface-variant"
                                      }`}
                                    >
                                      {bq.publisher_credibility.replace(
                                        /_/g,
                                        " ",
                                      )}
                                    </span>
                                  ) : (
                                    <span className="text-outline text-xs">
                                      —
                                    </span>
                                  )}
                                </td>
                              )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </section>

              {/* Patents */}
              <section className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">
                      lightbulb
                    </span>
                    Patents
                  </h3>
                  <span className="text-xs text-on-surface-variant">
                    {candidate.patents.length} record(s)
                  </span>
                </div>
                {candidate.patents.length === 0 ? (
                  <p className="text-sm text-on-surface-variant px-6 py-6">
                    No patents recorded.
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-surface-container">
                        <th className="text-left px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                          Patent #
                        </th>
                        <th className="text-left px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                          Title
                        </th>
                        <th className="text-left px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                          Inventors
                        </th>
                        <th className="text-left px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                          Country
                        </th>
                        <th className="text-left px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                          Date
                        </th>
                        <th className="text-center px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                          Verify
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidate.patents.map((p, i) => (
                        <tr
                          key={i}
                          className="border-t border-outline-variant/10"
                        >
                          <td className="px-5 py-3 font-mono text-xs text-on-surface">
                            {p.patent_number || "—"}
                          </td>
                          <td className="px-5 py-3 font-medium text-on-surface">
                            {p.title || "—"}
                          </td>
                          <td className="px-5 py-3 text-on-surface-variant text-xs">
                            {p.inventors.join(", ") || "—"}
                          </td>
                          <td className="px-5 py-3 text-on-surface-variant">
                            {p.country || "—"}
                          </td>
                          <td className="px-5 py-3 text-on-surface-variant whitespace-nowrap">
                            {p.date || "—"}
                          </td>
                          <td className="px-5 py-3 text-center">
                            {p.url ? (
                              <a
                                href={p.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline text-xs inline-flex items-center gap-1"
                              >
                                Verify
                                <span className="material-symbols-outlined text-xs">
                                  open_in_new
                                </span>
                              </a>
                            ) : (
                              <span className="text-outline text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>

              {/* Supervision */}
              <section className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">
                        groups
                      </span>
                      Student Supervision
                    </h3>
                    {candidate.supervision.length > 0 && (
                      <p className="text-[10px] text-on-surface-variant mt-1 ml-6">
                        Main:{" "}
                        {
                          candidate.supervision.filter((s) =>
                            (s.role || "").toLowerCase().includes("main"),
                          ).length
                        }{" "}
                        · Co:{" "}
                        {
                          candidate.supervision.filter((s) =>
                            (s.role || "").toLowerCase().includes("co"),
                          ).length
                        }
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-on-surface-variant">
                    {candidate.supervision.length} record(s)
                  </span>
                </div>
                {candidate.supervision.length === 0 ? (
                  <p className="text-sm text-on-surface-variant px-6 py-6">
                    No supervision records found. Supervised student details are
                    usually not on a CV — request from the candidate via Email
                    Drafts if needed.
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-surface-container">
                        <th className="text-left px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                          Student
                        </th>
                        <th className="text-left px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                          Degree
                        </th>
                        <th className="text-left px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                          Role
                        </th>
                        <th className="text-center px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                          Year
                        </th>
                        <th className="text-left px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                          Thesis Title
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidate.supervision.map((s, i) => {
                        const isMain = (s.role || "")
                          .toLowerCase()
                          .includes("main");
                        return (
                          <tr
                            key={i}
                            className="border-t border-outline-variant/10"
                          >
                            <td className="px-5 py-3 font-medium text-on-surface">
                              {s.student_name || "—"}
                            </td>
                            <td className="px-5 py-3">
                              <span className="text-[10px] bg-primary-fixed text-on-primary-fixed font-bold px-2 py-0.5 rounded-full uppercase">
                                {s.degree || "—"}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                  isMain
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {s.role || "—"}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-center text-on-surface">
                              {s.year ?? "—"}
                            </td>
                            <td className="px-5 py-3 text-on-surface-variant text-xs">
                              {s.thesis_title || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </section>
            </div>
          )}

          {tab === "skills" && (
            <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-sm">
              {candidate.skills.length === 0 ? (
                <p className="text-on-surface-variant text-sm">
                  No skills extracted.
                </p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {candidate.skills.map((skill, i) => (
                    <span
                      key={i}
                      className="bg-primary-fixed text-on-primary-fixed text-sm font-medium px-4 py-2 rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "analysis" && (
            <div className="space-y-6">
              {/* Detailed missing info */}
              {candidate.missing_info_detailed &&
                candidate.missing_info_detailed.length > 0 && (
                  <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
                    <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">
                      Missing Information Details
                    </h3>
                    <div className="space-y-2">
                      {candidate.missing_info_detailed.map((item, i) => (
                        <div
                          key={i}
                          className={`flex items-center gap-3 p-3 rounded-lg ${
                            item.severity === "critical"
                              ? "bg-red-50 border border-red-200"
                              : item.severity === "high"
                                ? "bg-amber-50 border border-amber-200"
                                : item.severity === "medium"
                                  ? "bg-yellow-50 border border-yellow-200"
                                  : "bg-surface-container"
                          }`}
                        >
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              item.severity === "critical"
                                ? "bg-red-200 text-red-800"
                                : item.severity === "high"
                                  ? "bg-amber-200 text-amber-800"
                                  : item.severity === "medium"
                                    ? "bg-yellow-200 text-yellow-800"
                                    : "bg-surface-container-high text-on-surface-variant"
                            }`}
                          >
                            {item.severity}
                          </span>
                          <span className="text-sm text-on-surface">
                            {item.description}
                          </span>
                          <span className="text-xs text-on-surface-variant ml-auto">
                            {item.field}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Education analysis full */}
              {eduAnalysis && (
                <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
                  <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">
                    Educational Profile Assessment
                  </h3>
                  <p className="text-sm text-on-surface leading-relaxed">
                    {eduAnalysis.overall_assessment}
                  </p>
                  {eduAnalysis.institution_quality.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-bold text-on-surface-variant uppercase mb-2">
                        Institution Quality
                      </h4>
                      <div className="space-y-2">
                        {eduAnalysis.institution_quality.map((iq, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-sm py-2 border-b border-outline-variant/10 last:border-0"
                          >
                            <div>
                              <span className="text-on-surface font-medium">
                                {iq.institution}
                              </span>
                              <span className="text-on-surface-variant text-xs ml-2">
                                ({iq.level})
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap justify-end">
                              {iq.hec_category &&
                                iq.hec_category !== "N/A" &&
                                iq.hec_category !== "" && (
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                      iq.hec_category === "W"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : iq.hec_category === "X"
                                          ? "bg-blue-100 text-blue-800"
                                          : iq.hec_category === "Y"
                                            ? "bg-amber-100 text-amber-800"
                                            : "bg-surface-container text-on-surface-variant"
                                    }`}
                                  >
                                    HEC {iq.hec_category}
                                  </span>
                                )}
                              {iq.qs_rank && iq.qs_rank !== "unranked" && (
                                <span className="text-[10px] bg-violet-100 text-violet-800 font-bold px-2 py-0.5 rounded-full">
                                  QS #{iq.qs_rank}
                                </span>
                              )}
                              {iq.the_rank && iq.the_rank !== "unranked" && (
                                <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-full">
                                  THE #{iq.the_rank}
                                </span>
                              )}
                              {!iq.matched_name && (
                                <span className="text-[10px] text-outline">
                                  {iq.ranking_info}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Experience analysis full */}
              {expAnalysis && (
                <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
                  <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">
                    Professional Experience Assessment
                  </h3>
                  <p className="text-sm text-on-surface leading-relaxed">
                    {expAnalysis.overall_assessment}
                  </p>
                  {expAnalysis.career_progression.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-bold text-on-surface-variant uppercase mb-2">
                        Career Progression
                      </h4>
                      <div className="space-y-2">
                        {expAnalysis.career_progression.map((cp, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              {Array.from(
                                { length: cp.seniority_level },
                                (_, j) => (
                                  <div
                                    key={j}
                                    className="w-2 h-2 rounded-full bg-primary"
                                  />
                                ),
                              )}
                              {Array.from(
                                { length: 5 - cp.seniority_level },
                                (_, j) => (
                                  <div
                                    key={j}
                                    className="w-2 h-2 rounded-full bg-surface-container-high"
                                  />
                                ),
                              )}
                            </div>
                            <span className="text-sm font-medium text-on-surface">
                              {cp.title}
                            </span>
                            <span className="text-xs text-on-surface-variant">
                              at {cp.organization}
                            </span>
                            <span className="text-xs text-outline ml-auto">
                              {cp.period}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Research Quality Analysis (Milestone 3) */}
              {researchProfile && researchProfile.total_publications > 0 && (
                <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                      Research Quality Analysis
                    </h3>
                    {researchProfile.research_score != null && (
                      <span className="text-2xl font-bold text-violet-600">
                        {researchProfile.research_score}/100
                      </span>
                    )}
                  </div>

                  {/* Quality metrics row */}
                  <div className="grid grid-cols-4 gap-3 mb-5">
                    <div className="bg-surface-container rounded-lg p-3 text-center">
                      <span className="text-xl font-bold text-emerald-600">
                        {researchProfile.high_quality_journal_count}
                      </span>
                      <p className="text-[10px] text-outline uppercase mt-1">
                        Q1/Q2 Journals
                      </p>
                    </div>
                    <div className="bg-surface-container rounded-lg p-3 text-center">
                      <span className="text-xl font-bold text-sky-600">
                        {researchProfile.top_conference_count}
                      </span>
                      <p className="text-[10px] text-outline uppercase mt-1">
                        CORE A*/A Conf.
                      </p>
                    </div>
                    <div className="bg-surface-container rounded-lg p-3 text-center">
                      <span className="text-xl font-bold text-primary">
                        {researchProfile.first_author_count}
                      </span>
                      <p className="text-[10px] text-outline uppercase mt-1">
                        First/Sole Author
                      </p>
                    </div>
                    <div className="bg-surface-container rounded-lg p-3 text-center">
                      <span className="text-xl font-bold text-violet-600">
                        {researchProfile.scopus_indexed_count}
                      </span>
                      <p className="text-[10px] text-outline uppercase mt-1">
                        Scopus Indexed
                      </p>
                    </div>
                  </div>

                  {/* Topic variability */}
                  {researchProfile.topic_variability &&
                    researchProfile.topic_variability.topic_breakdown.length >
                      0 && (
                      <div className="mb-5">
                        <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">
                          Research Topic Distribution
                          <span className="ml-2 text-outline font-normal normal-case">
                            Diversity:{" "}
                            {(
                              researchProfile.topic_variability
                                .diversity_score * 100
                            ).toFixed(0)}
                            %
                            {researchProfile.topic_variability.is_specialist
                              ? " (Specialist)"
                              : " (Broad)"}
                          </span>
                        </h4>
                        <div className="space-y-2">
                          {researchProfile.topic_variability.topic_breakdown
                            .slice(0, 8)
                            .map((item, i) => (
                              <div key={i} className="flex items-center gap-3">
                                <span className="text-xs text-on-surface-variant w-40 truncate capitalize flex-shrink-0">
                                  {item.area}
                                </span>
                                <div className="flex-1 h-2 rounded-full bg-surface-container">
                                  <div
                                    className="h-full rounded-full bg-primary"
                                    style={{ width: `${item.percentage}%` }}
                                  />
                                </div>
                                <span className="text-xs text-outline w-10 text-right flex-shrink-0">
                                  {item.percentage}%
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                  {/* Co-author analysis */}
                  {researchProfile.co_author_analysis &&
                    researchProfile.co_author_analysis.unique_co_authors >
                      0 && (
                      <div>
                        <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">
                          Collaboration Profile
                        </h4>
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <div className="bg-surface-container rounded-lg p-3 text-center">
                            <span className="text-xl font-bold text-on-surface">
                              {
                                researchProfile.co_author_analysis
                                  .unique_co_authors
                              }
                            </span>
                            <p className="text-[10px] text-outline uppercase mt-1">
                              Unique Co-Authors
                            </p>
                          </div>
                          <div className="bg-surface-container rounded-lg p-3 text-center">
                            <span className="text-xl font-bold text-on-surface">
                              {researchProfile.co_author_analysis.avg_team_size}
                            </span>
                            <p className="text-[10px] text-outline uppercase mt-1">
                              Avg Team Size
                            </p>
                          </div>
                          <div className="bg-surface-container rounded-lg p-3 text-center">
                            <span className="text-xl font-bold text-on-surface">
                              {
                                researchProfile.co_author_analysis
                                  .single_author_papers
                              }
                            </span>
                            <p className="text-[10px] text-outline uppercase mt-1">
                              Solo Papers
                            </p>
                          </div>
                        </div>
                        {researchProfile.co_author_analysis
                          .most_frequent_collaborators.length > 0 && (
                          <div>
                            <p className="text-xs text-on-surface-variant uppercase tracking-widest mb-2">
                              Top Collaborators
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {researchProfile.co_author_analysis.most_frequent_collaborators
                                .slice(0, 6)
                                .map((c, i) => (
                                  <span
                                    key={i}
                                    className="text-[11px] bg-primary-fixed text-on-primary-fixed px-3 py-1 rounded-full"
                                  >
                                    {c.name}{" "}
                                    <span className="opacity-70">
                                      ({c.count})
                                    </span>
                                  </span>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                </div>
              )}

              {/* Research summary (fallback) */}
              {!researchProfile &&
                researchSummary &&
                researchSummary.total_publications > 0 && (
                  <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
                    <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">
                      Research Summary
                    </h3>
                    <p className="text-sm text-on-surface leading-relaxed">
                      {researchSummary.overall_assessment}
                    </p>
                  </div>
                )}

              {!eduAnalysis && !expAnalysis && (
                <div className="bg-surface-container-lowest rounded-2xl p-12 text-center shadow-sm">
                  <span className="material-symbols-outlined text-4xl text-outline mb-3 block">
                    analytics
                  </span>
                  <h3 className="font-semibold text-on-surface mb-1">
                    No analysis available yet
                  </h3>
                  <p className="text-sm text-on-surface-variant mb-4">
                    Click &quot;Re-analyze&quot; to run the full analysis
                    pipeline.
                  </p>
                  <button
                    onClick={handleReanalyze}
                    disabled={analyzing}
                    className="px-6 py-2 rounded-lg primary-gradient text-white font-semibold text-sm shadow-md disabled:opacity-50"
                  >
                    {analyzing ? "Analyzing..." : "Run Analysis"}
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === "raw" && (
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
              <pre className="text-xs text-on-surface-variant whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">
                {candidate.raw_text || "No raw text available."}
              </pre>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
