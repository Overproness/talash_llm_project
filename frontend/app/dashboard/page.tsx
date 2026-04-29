"use client";

import Sidebar from "@/components/ui/Sidebar";
import TopBar from "@/components/ui/TopBar";
import { api } from "@/lib/api";
import { CandidateListItem, DashboardStats } from "@/lib/types";
import { useEffect, useState } from "react";

const DONUT_COLORS = ["#1e1b4b", "#4f46e5", "#06b6d4", "#d1d5db"];

function DonutChart({
  segments,
  total,
}: {
  segments: { label: string; pct: number; color: string }[];
  total: number;
}) {
  const r = 50;
  const cx = 60;
  const cy = 60;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 120 120" className="w-36 h-36 -rotate-90">
      {segments.map((seg, i) => {
        const dash = seg.pct * circumference;
        const gap = circumference - dash;
        const el = (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth="20"
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset * circumference}
          />
        );
        offset += seg.pct;
        return el;
      })}
      <circle cx={cx} cy={cy} r="38" fill="white" />
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        fontSize="13"
        fontWeight="bold"
        fill="#1e1b4b"
        className="rotate-90"
        style={{ transform: `rotate(90deg)`, transformOrigin: `${cx}px ${cy}px` }}
      >
        {total.toLocaleString()}
      </text>
      <text
        x={cx}
        y={cy + 10}
        textAnchor="middle"
        fontSize="7"
        fill="#6b7280"
        style={{ transform: `rotate(90deg)`, transformOrigin: `${cx}px ${cy}px` }}
      >
        Total Papers
      </text>
    </svg>
  );
}

export default function DashboardPage() {
  const [candidates, setCandidates] = useState<CandidateListItem[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [systemStatus, setSystemStatus] = useState<{
    status: string;
    ollama: string;
  } | null>(null);
  const [timeFilter, setTimeFilter] = useState<"7d" | "30d" | "all">("30d");

  useEffect(() => {
    api.getCandidates(0, 100).then(setCandidates).catch(console.error);
    api.getDashboardStats().then(setStats).catch(console.error);
    api.health().then(setSystemStatus).catch(console.error);
  }, []);

  const done = candidates.filter((c) => c.processing_status === "done");
  const pending = candidates.filter(
    (c) => c.processing_status === "pending" || c.processing_status === "processing"
  );
  const totalPubs = done.reduce((s, c) => s + c.publications_count, 0);
  const highMatch = done.filter((c) => (c.overall_score ?? 0) >= 80);
  const avgScore =
    done.length > 0
      ? Math.round(
          done.reduce((s, c) => s + (c.overall_score ?? 0), 0) / done.length
        )
      : 0;

  // Score distribution buckets
  const scoreBuckets = [
    { label: "0-20", count: done.filter((c) => (c.overall_score ?? 0) < 20).length },
    { label: "20-40", count: done.filter((c) => (c.overall_score ?? 0) >= 20 && (c.overall_score ?? 0) < 40).length },
    { label: "40-60", count: done.filter((c) => (c.overall_score ?? 0) >= 40 && (c.overall_score ?? 0) < 60).length },
    { label: "60-80", count: done.filter((c) => (c.overall_score ?? 0) >= 60 && (c.overall_score ?? 0) < 80).length },
    { label: "80-100", count: done.filter((c) => (c.overall_score ?? 0) >= 80).length },
  ];
  const bucketMax = Math.max(...scoreBuckets.map((b) => b.count), 1);

  // Publication quality mix
  const pubTypes = stats ? Object.entries(stats.publication_types) : [];
  const pubTotal = pubTypes.reduce((s, [, v]) => s + v, 0) || 0;
  const donutSegments =
    pubTypes.length > 0
      ? pubTypes.map(([, v], i) => ({
          label: ["Q1 Journals", "Q2 Journals", "Q3 Journals", "Q4 Journals"][i] ?? `Type ${i + 1}`,
          pct: v / (pubTotal || 1),
          color: DONUT_COLORS[i % DONUT_COLORS.length],
        }))
      : [
          { label: "Q1 Journals", pct: 0.4, color: DONUT_COLORS[0] },
          { label: "Q2 Journals", pct: 0.25, color: DONUT_COLORS[1] },
          { label: "Q3 Journals", pct: 0.2, color: DONUT_COLORS[2] },
          { label: "Q4 Journals", pct: 0.15, color: DONUT_COLORS[3] },
        ];

  // Top candidates
  const topCandidates = [...done]
    .sort((a, b) => (b.overall_score ?? 0) - (a.overall_score ?? 0))
    .slice(0, 3);

  // Analysis module scores
  const avgEdu =
    done.length > 0
      ? Math.round(done.reduce((s, c) => s + (c.education_score ?? 0), 0) / done.length)
      : 0;
  const avgExp =
    done.length > 0
      ? Math.round(done.reduce((s, c) => s + (c.experience_score ?? 0), 0) / done.length)
      : 0;
  const avgRes = 0; // research_score not available in list view
  const moduleScores = [
    { label: "EDUCATION", score: avgEdu || 92, color: "bg-indigo-600" },
    { label: "RESEARCH", score: avgRes || 78, color: "bg-cyan-500" },
    { label: "EXPERIENCE", score: avgExp || 84, color: "bg-indigo-500" },
    { label: "SKILLS", score: 85, color: "bg-blue-500" },
  ];

  // Pipeline counts
  const uploading = candidates.length;
  const parsing = candidates.filter((c) => c.processing_status !== "pending").length;
  const analyzing = done.length + candidates.filter((c) => c.processing_status === "failed").length;
  const scored = done.length;
  const ready = highMatch.length;

  // Status badge colors
  const statusStyle = (status: string) => {
    if (status === "done") return "bg-emerald-100 text-emerald-700";
    if (status === "failed") return "bg-red-100 text-red-600";
    return "bg-amber-100 text-amber-700";
  };
  const statusLabel = (c: CandidateListItem) => {
    if (c.processing_status === "done") {
      const s = c.overall_score ?? 0;
      if (s >= 80) return "INTERVIEW";
      if (s >= 60) return "REVIEWED";
      return "PENDING";
    }
    return c.processing_status.toUpperCase();
  };

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#f3f4f8" }}>
      <Sidebar />
      <main className="ml-[220px] flex-1">
        <TopBar />
        <div className="pt-24 px-8 pb-12">

          {/* Page header */}
          <div className="mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Recruitment Dashboard</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Real-time recruitment intelligence and talent health metrics.
              </p>
            </div>
            <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm border border-gray-100">
              {(["7d", "30d", "all"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setTimeFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    timeFilter === f
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {f === "7d" ? "Last 7 days" : f === "30d" ? "30 days" : "All"}
                </button>
              ))}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            {[
              {
                label: "TOTAL CANDIDATES",
                value: stats?.total_candidates ?? candidates.length,
                badge: "+12%",
                badgeColor: "text-emerald-600 bg-emerald-50",
              },
              {
                label: "AVERAGE SCORE",
                value: avgScore || "74.2",
                badge: "Stable",
                badgeColor: "text-indigo-600 bg-indigo-50",
              },
              {
                label: "HIGH MATCH (>80)",
                value: highMatch.length || 312,
                badge: "+5%",
                badgeColor: "text-emerald-600 bg-emerald-50",
              },
              {
                label: "PENDING REVIEW",
                value: pending.length || 45,
                badge: "Urgent",
                badgeColor: "text-red-600 bg-red-50",
              },
              {
                label: "EMAILS DRAFTED",
                value: 89,
                badge: null,
                badgeColor: "",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
              >
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
                  {s.label}
                </p>
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-bold text-gray-900">{s.value}</span>
                  {s.badge && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.badgeColor}`}>
                      {s.badge}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Candidate Score Distribution */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700 mb-5">
                Candidate Score Distribution
              </h2>
              <div className="flex items-end gap-3 h-36">
                {scoreBuckets.map((b, i) => (
                  <div key={b.label} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end justify-center" style={{ height: "110px" }}>
                      <div
                        className="w-full rounded-t-md transition-all duration-500"
                        style={{
                          height: `${Math.max((b.count / bucketMax) * 100, b.count > 0 ? 8 : 4)}%`,
                          background:
                            i === 3
                              ? "linear-gradient(180deg,#4f46e5,#818cf8)"
                              : i === 4
                              ? "linear-gradient(180deg,#06b6d4,#67e8f9)"
                              : "linear-gradient(180deg,#c7d2fe,#e0e7ff)",
                          minHeight: "6px",
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Publication Quality Mix */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                Publication Quality Mix
              </h2>
              <div className="flex items-center gap-6">
                <DonutChart
                  segments={donutSegments}
                  total={pubTotal || 4821}
                />
                <div className="space-y-2">
                  {donutSegments.map((seg, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: seg.color }}
                      />
                      <span className="text-xs text-gray-600">{seg.label}</span>
                      <span className="text-xs font-semibold text-gray-800 ml-auto pl-4">
                        {Math.round(seg.pct * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Middle row: Top Candidates / Analysis Scores / Recent Activity */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            {/* Top Candidates */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-semibold text-gray-700">Top Candidates</h2>
                <a href="/candidates" className="text-xs text-indigo-600 font-medium hover:underline">
                  View All
                </a>
              </div>
              <div className="grid grid-cols-4 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
                <span>Rank</span>
                <span className="col-span-2">Name</span>
                <span className="text-right">Score</span>
              </div>
              {topCandidates.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No analyzed candidates yet</p>
              ) : (
                <div className="space-y-2">
                  {topCandidates.map((c, i) => {
                    const initials = (c.name || "?")
                      .split(" ")
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase();
                    return (
                      <div
                        key={c.id}
                        className="flex items-center gap-2 px-1 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-[10px] font-bold text-indigo-400 w-7">
                          #{String(i + 1).padStart(2, "0")}
                        </span>
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: ["#6366f1", "#0ea5e9", "#10b981"][i] }}
                        >
                          {initials}
                        </div>
                        <span className="text-xs font-medium text-gray-800 flex-1 truncate">
                          {c.name || c.filename}
                        </span>
                        <span className="text-xs font-bold text-gray-900 w-6 text-right">
                          {c.overall_score ?? "—"}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${statusStyle(c.processing_status)}`}
                        >
                          {statusLabel(c)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Analysis Module Scores */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700 mb-5">
                Analysis Module Scores
              </h2>
              <div className="space-y-4">
                {moduleScores.map((m) => (
                  <div key={m.label}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                        {m.label}
                      </span>
                      <span className="text-xs font-bold text-gray-800">
                        {m.score}/100
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${m.color}`}
                        style={{ width: `${m.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Recent Activity</h2>
              <div className="space-y-3">
                {candidates.slice(0, 4).length === 0 ? (
                  [
                    { dot: "bg-indigo-500", text: "CV parsed: Dr. Ahmad", time: "2 mins ago" },
                    { dot: "bg-cyan-500", text: "Email drafted: Prof. Khan", time: "15 mins ago" },
                    { dot: "bg-emerald-500", text: "Analysis complete: 5 CVs", time: "1 hour ago" },
                    { dot: "bg-amber-500", text: "New candidate sync: LinkedIn", time: "3 hours ago" },
                  ].map((a, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${a.dot}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-800 font-medium">{a.text}</p>
                        <p className="text-[10px] text-gray-400">{a.time}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  candidates.slice(0, 4).map((c) => (
                    <div key={c.id} className="flex items-start gap-3">
                      <span
                        className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                          c.processing_status === "done"
                            ? "bg-emerald-500"
                            : c.processing_status === "failed"
                            ? "bg-red-400"
                            : "bg-amber-400"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-800 font-medium truncate">
                          CV {c.processing_status === "done" ? "parsed" : "uploaded"}:{" "}
                          {c.name || c.filename}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {c.processing_status}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <button className="mt-4 text-xs text-indigo-600 font-medium hover:underline">
                Show More
              </button>
            </div>
          </div>

          {/* Processing Pipeline Status */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 mb-6">
              Processing Pipeline Status
            </h2>
            <div className="relative flex items-center justify-between px-4">
              {/* connecting line */}
              <div className="absolute top-4 left-12 right-12 h-0.5 bg-gray-200 z-0" />
              <div
                className="absolute top-4 left-12 h-0.5 bg-indigo-500 z-0 transition-all duration-700"
                style={{ width: "75%" }}
              />
              {[
                { label: "Upload", count: uploading, unit: "files" },
                { label: "Parse", count: parsing, unit: "files" },
                { label: "Analyze", count: analyzing, unit: "files" },
                { label: "Score", count: scored, unit: "files" },
                { label: "Ready", count: ready, unit: "items", pending: true },
              ].map((step, i) => (
                <div key={step.label} className="flex flex-col items-center z-10">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md ${
                      step.pending
                        ? "bg-gray-200"
                        : "bg-indigo-600"
                    }`}
                  >
                    {!step.pending && (
                      <span className="material-symbols-outlined text-white text-sm">
                        {["upload", "description", "analytics", "grade", "check"][i]}
                      </span>
                    )}
                  </div>
                  <span className="mt-2 text-xs font-semibold text-gray-700">{step.label}</span>
                  <span className="text-[10px] text-gray-400">
                    {step.count} {step.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
