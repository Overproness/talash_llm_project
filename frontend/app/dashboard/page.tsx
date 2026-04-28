"use client";

import Sidebar from "@/components/ui/Sidebar";
import TopBar from "@/components/ui/TopBar";
import { api } from "@/lib/api";
import { CandidateListItem, DashboardStats } from "@/lib/types";
import { useEffect, useState } from "react";

const BAR_COLORS = [
  "bg-primary",
  "bg-emerald-500",
  "bg-blue-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-pink-500",
  "bg-teal-500",
];

const PIE_COLORS = [
  "#6366f1",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
];

export default function DashboardPage() {
  const [candidates, setCandidates] = useState<CandidateListItem[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [systemStatus, setSystemStatus] = useState<{
    status: string;
    ollama: string;
  } | null>(null);

  useEffect(() => {
    api.getCandidates(0, 100).then(setCandidates).catch(console.error);
    api.getDashboardStats().then(setStats).catch(console.error);
    api.health().then(setSystemStatus).catch(console.error);
  }, []);

  const done = candidates.filter((c) => c.processing_status === "done");
  const withMissing = candidates.filter((c) => c.missing_fields_count > 0);
  const totalPubs = done.reduce((s, c) => s + c.publications_count, 0);

  // Helpers for charts
  const eduLevels = stats ? Object.entries(stats.education_levels) : [];
  const eduMax =
    eduLevels.length > 0 ? Math.max(...eduLevels.map(([, v]) => v), 1) : 1;
  const pubTypes = stats ? Object.entries(stats.publication_types) : [];
  const pubTotal = pubTypes.reduce((s, [, v]) => s + v, 0) || 1;
  const topSkills = stats?.top_skills?.slice(0, 10) ?? [];
  const skillMax =
    topSkills.length > 0 ? Math.max(...topSkills.map((s) => s.count), 1) : 1;

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="ml-[220px] flex-1">
        <TopBar />
        <div className="pt-24 px-8 pb-12">
          <div className="mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-on-surface">
                Dashboard
              </h1>
              <p className="text-on-surface-variant mt-1 text-sm">
                Recruitment pipeline overview
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${systemStatus?.ollama === "available" ? "bg-emerald-400" : "bg-amber-400"}`}
              ></span>
              <span className="text-on-surface-variant">
                AI Engine: {systemStatus?.ollama ?? "…"}
              </span>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-6 mb-10">
            {[
              {
                icon: "group",
                label: "Total Candidates",
                value: stats?.total_candidates ?? candidates.length,
                color: "bg-primary-fixed text-on-primary-fixed",
              },
              {
                icon: "check_circle",
                label: "Analyzed",
                value: done.length,
                color: "bg-primary-fixed text-on-primary-fixed",
              },
              {
                icon: "article",
                label: "Publications Found",
                value: totalPubs,
                color: "bg-tertiary-fixed text-on-tertiary-fixed",
              },
              {
                icon: "warning",
                label: "Missing Info",
                value: withMissing.length,
                color: "bg-error-container text-on-error-container",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2 rounded-lg ${s.color}`}>
                    <span className="material-symbols-outlined">{s.icon}</span>
                  </div>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">
                    {s.label}
                  </span>
                </div>
                <div className="text-4xl font-bold text-on-surface">
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          {/* Charts row 1 */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Education Level Distribution */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-6">
                Education Level Distribution
              </h2>
              {eduLevels.length === 0 ? (
                <p className="text-sm text-on-surface-variant">No data yet</p>
              ) : (
                <div className="space-y-3">
                  {eduLevels.map(([level, count], i) => (
                    <div key={level}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-on-surface capitalize font-medium">
                          {level}
                        </span>
                        <span className="text-on-surface-variant">{count}</span>
                      </div>
                      <div className="w-full h-3 rounded-full bg-surface-container">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${BAR_COLORS[i % BAR_COLORS.length]}`}
                          style={{ width: `${(count / eduMax) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Publication Types - SVG Donut */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-6">
                Publication Types
              </h2>
              {pubTypes.length === 0 ? (
                <p className="text-sm text-on-surface-variant">No data yet</p>
              ) : (
                <div className="flex items-center gap-8">
                  <svg
                    viewBox="0 0 120 120"
                    className="w-32 h-32 flex-shrink-0"
                  >
                    {(() => {
                      let cumulative = 0;
                      return pubTypes.map(([type, count], i) => {
                        const pct = count / pubTotal;
                        const startAngle = cumulative * 360;
                        cumulative += pct;
                        const endAngle = cumulative * 360;
                        const x1 =
                          60 +
                          50 * Math.cos(((startAngle - 90) * Math.PI) / 180);
                        const y1 =
                          60 +
                          50 * Math.sin(((startAngle - 90) * Math.PI) / 180);
                        const x2 =
                          60 + 50 * Math.cos(((endAngle - 90) * Math.PI) / 180);
                        const y2 =
                          60 + 50 * Math.sin(((endAngle - 90) * Math.PI) / 180);
                        const largeArc = pct > 0.5 ? 1 : 0;
                        return (
                          <path
                            key={type}
                            d={`M60,60 L${x1},${y1} A50,50 0 ${largeArc},1 ${x2},${y2} Z`}
                            fill={PIE_COLORS[i % PIE_COLORS.length]}
                          />
                        );
                      });
                    })()}
                    <circle
                      cx="60"
                      cy="60"
                      r="25"
                      fill="var(--md-sys-color-surface-container-lowest, #fff)"
                    />
                    <text
                      x="60"
                      y="64"
                      textAnchor="middle"
                      fontSize="14"
                      fontWeight="bold"
                      fill="currentColor"
                    >
                      {pubTypes.reduce((s, [, v]) => s + v, 0)}
                    </text>
                  </svg>
                  <div className="space-y-2">
                    {pubTypes.map(([type, count], i) => (
                      <div key={type} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-sm"
                          style={{
                            backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                          }}
                        />
                        <span className="text-sm text-on-surface capitalize">
                          {type}
                        </span>
                        <span className="text-xs text-on-surface-variant">
                          ({count})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Charts row 2 */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            {/* Top Skills */}
            <div className="col-span-2 bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-6">
                Top Skills
              </h2>
              {topSkills.length === 0 ? (
                <p className="text-sm text-on-surface-variant">No data yet</p>
              ) : (
                <div className="space-y-2">
                  {topSkills.map((s, i) => (
                    <div key={s.skill} className="flex items-center gap-3">
                      <span className="text-xs text-on-surface-variant w-28 truncate text-right">
                        {s.skill}
                      </span>
                      <div className="flex-1 h-4 rounded-full bg-surface-container">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${BAR_COLORS[i % BAR_COLORS.length]}`}
                          style={{ width: `${(s.count / skillMax) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-on-surface w-6 text-right">
                        {s.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Score Comparison */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-6">
                Score Comparison
              </h2>
              {!stats || stats.score_data.length === 0 ? (
                <p className="text-sm text-on-surface-variant">No data yet</p>
              ) : (
                <div className="space-y-4">
                  {stats.score_data.slice(0, 6).map((sd) => (
                    <div key={sd.name} className="space-y-1">
                      <p className="text-xs font-medium text-on-surface truncate">
                        {sd.name}
                      </p>
                      <div className="flex gap-1 items-center">
                        <div className="flex-1 h-2 rounded-full bg-surface-container">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${sd.overall_score ?? 0}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-on-surface-variant w-6 text-right">
                          {sd.overall_score ?? "—"}
                        </span>
                      </div>
                      <div className="flex gap-4 text-[10px] text-on-surface-variant">
                        <span>Edu: {sd.education_score ?? "—"}</span>
                        <span>Exp: {sd.experience_score ?? "—"}</span>
                        <span>Res: {sd.research_score ?? "—"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-3 gap-6">
            {/* Pipeline status */}
            <div className="col-span-2 bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-6">
                Processing Pipeline
              </h2>
              <div className="space-y-4">
                {[
                  {
                    label: "Text Extraction (PyMuPDF)",
                    status: "Operational",
                    ok: true,
                  },
                  {
                    label: "Fallback Parser (pdfplumber)",
                    status: "Operational",
                    ok: true,
                  },
                  {
                    label: "LLM Extraction",
                    status:
                      systemStatus?.ollama === "available"
                        ? "Online"
                        : "Offline – Rule-based fallback active",
                    ok: systemStatus?.ollama === "available",
                  },
                  {
                    label: "Education & Experience Analysis",
                    status: "Operational",
                    ok: true,
                  },
                  {
                    label: "Email Draft Generator",
                    status: "Operational",
                    ok: true,
                  },
                  {
                    label: "MongoDB Storage",
                    status:
                      done.length > 0 || candidates.length > 0
                        ? "Connected"
                        : "Checking…",
                    ok: true,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-2 h-2 rounded-full ${item.ok ? "bg-emerald-400" : "bg-amber-400"}`}
                      ></span>
                      <span className="text-sm text-on-surface">
                        {item.label}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-medium ${item.ok ? "text-emerald-600" : "text-amber-600"}`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent activity */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-6">
                Recent Uploads
              </h2>
              {candidates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <span className="material-symbols-outlined text-3xl text-outline mb-2">
                    inbox
                  </span>
                  <p className="text-sm text-on-surface-variant">
                    No candidates yet.
                  </p>
                  <p className="text-xs text-outline mt-1">
                    Upload CVs from the Home page.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {candidates.slice(0, 5).map((c) => (
                    <div key={c.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-bold text-xs flex-shrink-0">
                        {(c.name || "U").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-on-surface truncate">
                          {c.name || c.filename}
                        </p>
                        <p
                          className={`text-xs ${c.processing_status === "done" ? "text-emerald-600" : c.processing_status === "failed" ? "text-error" : "text-amber-600"}`}
                        >
                          {c.processing_status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
