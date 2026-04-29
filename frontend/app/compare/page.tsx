"use client";

import Sidebar from "@/components/ui/Sidebar";
import TopBar from "@/components/ui/TopBar";
import { api } from "@/lib/api";
import { CandidateFull, CandidateListItem } from "@/lib/types";
import { useEffect, useState } from "react";

// ── Colour palette for up to 3 candidate slots ──────────────────────────────
const COLORS = [
  {
    text: "text-primary",
    scoreBg: "bg-primary/10 text-primary",
    dotClass: "bg-primary",
    polygon: "#4648d4",
    fill: "rgba(70,72,212,0.15)",
  },
  {
    text: "text-teal-600",
    scoreBg: "bg-teal-100 text-teal-700",
    dotClass: "bg-teal-500",
    polygon: "#14b8a6",
    fill: "rgba(20,184,166,0.15)",
  },
  {
    text: "text-violet-600",
    scoreBg: "bg-violet-100 text-violet-700",
    dotClass: "bg-violet-500",
    polygon: "#8b5cf6",
    fill: "rgba(139,92,246,0.15)",
  },
];

// ── Radar chart constants ─────────────────────────────────────────────────────
// SVG viewBox "0 0 200 200", labels placed via absolute CSS
const CX = 100;
const CY = 100;
const R_MAX = 76;

// 4 axes: Experience (top), Education (right), Research (bottom), Technical (left)
const AXES_ANGLES = [
  -Math.PI / 2, // top
  0, // right
  Math.PI / 2, // bottom
  Math.PI, // left
];

function radarPt(angle: number, pct: number): [number, number] {
  const v = Math.max(0, Math.min(100, pct)) / 100;
  return [CX + R_MAX * v * Math.cos(angle), CY + R_MAX * v * Math.sin(angle)];
}

function getRadarScores(c: CandidateFull): number[] {
  return [
    c.experience_analysis?.experience_score ?? 0,
    c.education_analysis?.education_score ?? 0,
    c.research_profile?.research_score ?? 0,
    Math.min(100, (c.skills.length / 15) * 100), // technical proxy
  ];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function scoreBadgeClass(v: number | null | undefined): string {
  if (v == null) return "bg-surface-container text-outline";
  if (v >= 80) return "bg-emerald-100 text-emerald-700";
  if (v >= 60) return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

function scoreTextClass(v: number | null | undefined): string {
  if (v == null) return "text-outline-variant";
  if (v >= 80) return "text-emerald-600 font-bold";
  if (v >= 60) return "text-amber-600 font-bold";
  return "text-rose-600 font-bold";
}

function highestEdu(c: CandidateFull): string {
  const ORDER = [
    "phd",
    "pg",
    "masters",
    "ms",
    "mphil",
    "ug",
    "bachelors",
    "bs",
    "be",
  ];
  const sorted = [...c.education]
    .map((e) => e.level?.toLowerCase() ?? "")
    .sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  if (!sorted[0]) return "—";
  const top = c.education.find((e) => e.level?.toLowerCase() === sorted[0]);
  const inst = top?.institution?.split(" ").slice(0, 2).join(" ") ?? "";
  return `${sorted[0].toUpperCase()}${inst ? ", " + inst : ""}`;
}

function bestCGPA(c: CandidateFull): string {
  const scores = c.education
    .map((e) => e.normalized_score)
    .filter((s): s is number => s != null);
  if (!scores.length) return "—";
  return (Math.max(...scores) / 25).toFixed(2);
}

function pubQualityCounts(c: CandidateFull): { q1: number; rest: number } {
  const quality = c.research_profile?.publication_quality ?? [];
  const q1 = quality.filter((p) => p.journal_quality?.quartile === "Q1").length;
  const rest = quality.filter(
    (p) => p.journal_quality?.quartile && p.journal_quality.quartile !== "Q1",
  ).length;
  return { q1, rest };
}

function candidateInitial(c: CandidateFull): string {
  return (c.personal_info.name || c.filename || "?").charAt(0).toUpperCase();
}

function candidateFirstName(c: CandidateFull): string {
  return c.personal_info.name?.split(" ")[0] || c.filename || "Candidate";
}

// ── Candidate slot card ───────────────────────────────────────────────────────
function CandidateSlot({
  candidate,
  colorIdx,
  loading,
  onAdd,
  onRemove,
}: {
  candidate: CandidateFull | null;
  colorIdx: number;
  loading: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  if (loading) {
    return (
      <div className="bg-surface-container-lowest p-5 rounded-xl flex items-center justify-center min-h-[88px]">
        <span className="text-sm text-on-surface-variant animate-pulse">
          Loading…
        </span>
      </div>
    );
  }

  if (!candidate) {
    return (
      <button
        onClick={onAdd}
        className="bg-surface-container-low border-2 border-dashed border-outline-variant/30 p-5 rounded-xl flex items-center justify-center gap-3 group hover:bg-surface-container-high hover:border-primary/50 transition-all min-h-[88px]"
      >
        <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-outline group-hover:bg-primary group-hover:text-white transition-all">
          <span className="material-symbols-outlined">add</span>
        </div>
        <span className="text-sm font-semibold text-on-surface-variant group-hover:text-primary transition-all">
          Add Candidate
        </span>
      </button>
    );
  }

  const color = COLORS[colorIdx];
  return (
    <div className="bg-surface-container-lowest p-5 rounded-xl flex items-center gap-4 group relative">
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl text-white flex-shrink-0 ${color.dotClass}`}
      >
        {candidateInitial(candidate)}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-on-surface leading-tight truncate">
          {candidate.personal_info.name || candidate.filename}
        </h3>
        <p className="text-xs text-on-surface-variant truncate">
          {candidate.personal_info.present_employment || highestEdu(candidate)}
        </p>
      </div>
      <div
        className={`px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${color.scoreBg}`}
      >
        {candidate.overall_score?.toFixed(1) ?? "—"}
      </div>
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-outline hover:text-error"
        aria-label="Remove candidate"
      >
        <span className="material-symbols-outlined text-sm">close</span>
      </button>
    </div>
  );
}

// ── Candidate picker modal ────────────────────────────────────────────────────
function CandidatePicker({
  candidates,
  alreadySelected,
  onSelect,
  onClose,
}: {
  candidates: CandidateListItem[];
  alreadySelected: string[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = candidates
    .filter(
      (c) => c.processing_status === "done" && !alreadySelected.includes(c.id),
    )
    .filter((c) =>
      (c.name || c.filename).toLowerCase().includes(search.toLowerCase()),
    );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-on-surface">
            Select Candidate
          </h3>
          <button
            onClick={onClose}
            className="text-outline hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <input
          type="text"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-primary/20"
          autoFocus
        />
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="text-sm text-on-surface-variant text-center py-6">
              No candidates available
            </p>
          )}
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-surface-container-low transition-colors text-left"
            >
              <div>
                <p className="text-sm font-medium text-on-surface">
                  {c.name || c.filename}
                </p>
                <p className="text-xs text-on-surface-variant">
                  {c.edu_level || "—"}
                </p>
              </div>
              <span className="text-sm font-bold text-primary">
                {c.overall_score ?? "—"}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Radar SVG ─────────────────────────────────────────────────────────────────
function RadarChart({ slots }: { slots: (CandidateFull | null)[] }) {
  const gridLevels = [25, 50, 75, 100];
  const filledSlots = slots
    .map((c, i) => (c ? { c, i } : null))
    .filter((x): x is { c: CandidateFull; i: number } => x !== null);

  return (
    <div className="relative w-full max-w-[260px] mx-auto">
      {/* Axis labels — absolutely placed outside SVG */}
      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-wider text-on-surface-variant whitespace-nowrap">
        EXPERIENCE
      </span>
      <span className="absolute right-[-52px] top-1/2 -translate-y-1/2 text-[9px] font-bold uppercase tracking-wider text-on-surface-variant whitespace-nowrap">
        EDUCATION
      </span>
      <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-wider text-on-surface-variant whitespace-nowrap">
        RESEARCH
      </span>
      <span className="absolute left-[-52px] top-1/2 -translate-y-1/2 text-[9px] font-bold uppercase tracking-wider text-on-surface-variant whitespace-nowrap">
        TECHNICAL
      </span>

      <svg viewBox="0 0 200 200" className="w-full h-full">
        {/* Grid circles */}
        {gridLevels.map((lvl) => (
          <circle
            key={lvl}
            cx={CX}
            cy={CY}
            r={(R_MAX * lvl) / 100}
            fill="none"
            stroke="#c7c4d7"
            strokeWidth="0.5"
            opacity="0.7"
          />
        ))}
        {/* Axis lines */}
        {AXES_ANGLES.map((angle, j) => {
          const [x, y] = radarPt(angle, 100);
          return (
            <line
              key={j}
              x1={CX}
              y1={CY}
              x2={x}
              y2={y}
              stroke="#c7c4d7"
              strokeWidth="0.5"
              opacity="0.7"
            />
          );
        })}
        {/* Candidate polygons */}
        {filledSlots.map(({ c, i }) => {
          const color = COLORS[i];
          const scores = getRadarScores(c);
          const pts = AXES_ANGLES.map((angle, j) => radarPt(angle, scores[j]));
          return (
            <polygon
              key={c.id}
              points={pts.map(([x, y]) => `${x},${y}`).join(" ")}
              fill={color.fill}
              stroke={color.polygon}
              strokeWidth="2"
            />
          );
        })}
      </svg>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ComparePage() {
  const [candidateList, setCandidateList] = useState<CandidateListItem[]>([]);
  const [slots, setSlots] = useState<(CandidateFull | null)[]>([
    null,
    null,
    null,
  ]);
  const [loadingSlot, setLoadingSlot] = useState<number | null>(null);
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);

  useEffect(() => {
    api.getCandidates(0, 200).then(setCandidateList).catch(console.error);
  }, []);

  const filledSlots = slots.filter(Boolean) as CandidateFull[];
  const alreadySelected = filledSlots.map((c) => c.id);

  const openPicker = (idx: number) => setPickerSlot(idx);

  const handleAddCandidateBtn = () => {
    const firstEmpty = slots.findIndex((s) => s === null);
    if (firstEmpty >= 0) openPicker(firstEmpty);
  };

  const handleSelect = async (candidateId: string) => {
    if (pickerSlot === null) return;
    const slotIdx = pickerSlot;
    setPickerSlot(null);
    setLoadingSlot(slotIdx);
    try {
      const data = await api.getCandidate(candidateId);
      setSlots((prev) => {
        const next = [...prev];
        next[slotIdx] = data;
        return next;
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSlot(null);
    }
  };

  const removeSlot = (idx: number) => {
    setSlots((prev) => {
      const next = [...prev];
      next[idx] = null;
      return next;
    });
  };

  // Publication bar chart data
  const pubData = slots.map((c) => (c ? pubQualityCounts(c) : null));
  const maxPub = Math.max(
    1,
    ...pubData.flatMap((d) => (d ? [d.q1, d.rest] : [0])),
  );

  // Comparison table row definitions
  const tableRows: {
    label: string;
    render: (c: CandidateFull) => React.ReactNode;
  }[] = [
    {
      label: "Overall Score",
      render: (c) =>
        c.overall_score != null ? (
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${scoreBadgeClass(c.overall_score)}`}
          >
            {c.overall_score.toFixed(1)}
          </span>
        ) : (
          <span className="text-outline-variant">N/A</span>
        ),
    },
    {
      label: "Highest Degree",
      render: (c) => (
        <span className="text-on-surface-variant font-medium">
          {highestEdu(c)}
        </span>
      ),
    },
    {
      label: "CGPA (Scaled)",
      render: (c) => {
        const v = bestCGPA(c);
        return v !== "—" ? (
          <span className={scoreTextClass(parseFloat(v) * 25)}>{v}</span>
        ) : (
          <span className="text-outline-variant">—</span>
        );
      },
    },
    {
      label: "Journal Papers",
      render: (c) => (
        <span className="text-on-surface-variant">
          {c.research_profile?.journal_count ??
            c.research_summary?.journal_count ??
            "—"}
        </span>
      ),
    },
    {
      label: "Q1 Papers",
      render: (c) => {
        const q1 = pubQualityCounts(c).q1;
        return q1 > 0 ? (
          <span className="text-emerald-600 font-bold">{q1}</span>
        ) : (
          <span className="text-on-surface-variant">{q1}</span>
        );
      },
    },
    {
      label: "Experience Years",
      render: (c) => {
        const yrs = c.experience_analysis?.total_experience_years;
        return yrs != null ? (
          <span
            className={
              yrs >= 8
                ? "text-emerald-600 font-bold"
                : "text-on-surface-variant"
            }
          >
            {yrs.toFixed(1)}
          </span>
        ) : (
          <span className="text-on-surface-variant">
            {c.experience.length} rec.
          </span>
        );
      },
    },
    {
      label: "Research Index",
      render: (c) =>
        c.research_profile?.research_score != null ? (
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${scoreBadgeClass(c.research_profile.research_score)}`}
          >
            {c.research_profile.research_score}
          </span>
        ) : (
          <span className="text-outline-variant">N/A</span>
        ),
    },
  ];

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="ml-[220px] flex-1">
        <TopBar />
        <div className="pt-24 px-8 pb-12">
          {/* ── Header ── */}
          <div className="flex justify-between items-end mb-10">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-on-surface mb-1 uppercase">
                Compare Candidates
              </h1>
              <p className="text-on-surface-variant text-sm">
                Select up to three candidates to analyze performance metrics and
                publication quality side-by-side.
              </p>
            </div>
            {slots.some((s) => s === null) && (
              <button
                onClick={handleAddCandidateBtn}
                className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
              >
                <span className="material-symbols-outlined text-[20px]">
                  person_add
                </span>
                Add Candidate
              </button>
            )}
          </div>

          {/* ── Candidate Slots ── */}
          <div className="grid grid-cols-3 gap-6 mb-10">
            {slots.map((slot, i) => (
              <CandidateSlot
                key={i}
                candidate={slot}
                colorIdx={i}
                loading={loadingSlot === i}
                onAdd={() => openPicker(i)}
                onRemove={() => removeSlot(i)}
              />
            ))}
          </div>

          {/* ── Insights (shown as soon as ≥1 candidate loaded) ── */}
          {filledSlots.length >= 1 && (
            <>
              {/* Radar + Table row */}
              <div className="grid grid-cols-12 gap-8 mb-10">
                {/* Radar Chart */}
                <div className="col-span-12 lg:col-span-5 bg-white rounded-2xl p-8 flex flex-col items-center">
                  <div className="w-full flex justify-between items-start mb-8">
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                      Metric Overlay Analysis
                    </h4>
                    <span className="text-[10px] bg-surface-container-high px-2 py-1 rounded text-primary font-bold">
                      RADAR-INSIGHT
                    </span>
                  </div>

                  {/* SVG Radar with absolute labels */}
                  <div className="px-16 py-6 w-full">
                    <RadarChart slots={slots} />
                  </div>

                  {/* Legend */}
                  <div className="mt-6 flex flex-wrap gap-4 justify-center">
                    {slots.map(
                      (c, i) =>
                        c && (
                          <div key={c.id} className="flex items-center gap-2">
                            <div
                              className={`w-3 h-3 rounded-full ${COLORS[i].dotClass}`}
                            />
                            <span className="text-[10px] font-semibold text-on-surface">
                              {c.personal_info.name
                                ?.split(" ")
                                .slice(0, 2)
                                .join(" ") || c.filename}
                            </span>
                          </div>
                        ),
                    )}
                  </div>
                </div>

                {/* Comparison Table */}
                <div className="col-span-12 lg:col-span-7 bg-surface-container-lowest rounded-2xl p-4 overflow-hidden">
                  <table className="w-full text-left border-separate border-spacing-y-2">
                    <thead>
                      <tr>
                        <th className="p-4 text-[10px] font-bold text-outline uppercase tracking-widest">
                          Metric
                        </th>
                        {slots.map((c, i) => (
                          <th
                            key={i}
                            className={`p-4 text-center text-xs font-bold ${c ? COLORS[i].text : "text-outline-variant"}`}
                          >
                            {c ? candidateFirstName(c) : "—"}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {tableRows.map((row) => (
                        <tr
                          key={row.label}
                          className="group hover:bg-surface-container-low transition-colors"
                        >
                          <td className="p-4 rounded-l-xl font-medium text-on-surface">
                            {row.label}
                          </td>
                          {slots.map((c, i) => (
                            <td
                              key={i}
                              className={`p-4 text-center ${i === slots.length - 1 ? "rounded-r-xl" : ""}`}
                            >
                              {c ? (
                                row.render(c)
                              ) : (
                                <span className="text-outline-variant">—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── Publication Quality Distribution ── */}
              <div className="bg-surface-container-lowest rounded-2xl p-8">
                <div className="flex justify-between items-center mb-10">
                  <h4 className="text-lg font-bold text-on-surface">
                    Publication Quality Distribution
                  </h4>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary-container" />
                      <span className="text-xs font-semibold text-on-surface-variant">
                        Q1 Tier
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-secondary-container" />
                      <span className="text-xs font-semibold text-on-surface-variant">
                        Q2-Q4 Tier
                      </span>
                    </div>
                  </div>
                </div>

                {/* Grouped bar chart */}
                <div className="flex items-end gap-12 h-48 border-b border-outline-variant/30 pb-2 px-8">
                  {slots.map((c, i) => {
                    const d = pubData[i];
                    return (
                      <div
                        key={i}
                        className="flex-1 flex flex-col items-center"
                      >
                        {d ? (
                          <>
                            <div className="flex items-end gap-3 h-48">
                              {/* Q1 bar */}
                              <div
                                className="w-10 rounded-t-md bg-primary-container relative group/bar"
                                style={{
                                  height: `${Math.max(4, (d.q1 / maxPub) * 100)}%`,
                                }}
                              >
                                <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-on-surface text-white text-[10px] px-2 py-0.5 rounded whitespace-nowrap z-10">
                                  {d.q1} Q1 Paper{d.q1 !== 1 ? "s" : ""}
                                </div>
                              </div>
                              {/* Q2-Q4 bar */}
                              <div
                                className="w-10 rounded-t-md bg-secondary-container relative group/bar"
                                style={{
                                  height: `${Math.max(4, (d.rest / maxPub) * 100)}%`,
                                }}
                              >
                                <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-on-surface text-white text-[10px] px-2 py-0.5 rounded whitespace-nowrap z-10">
                                  {d.rest} Other Paper{d.rest !== 1 ? "s" : ""}
                                </div>
                              </div>
                            </div>
                            <span className="mt-4 text-[11px] font-bold uppercase tracking-wider text-on-surface">
                              {c!.personal_info.name
                                ? c!.personal_info.name
                                    .split(" ")[0]
                                    .toUpperCase() +
                                  ". " +
                                  (
                                    c!.personal_info.name
                                      .split(" ")
                                      .slice(-1)[0] ?? ""
                                  ).toUpperCase()
                                : c!.filename.toUpperCase()}
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="flex items-end gap-3 h-48">
                              <div className="w-24 h-full border-2 border-dashed border-outline-variant/20 rounded-t-md flex items-center justify-center text-outline-variant">
                                <span className="text-[10px]">NO DATA</span>
                              </div>
                            </div>
                            <span className="mt-4 text-[11px] font-bold uppercase tracking-wider text-outline-variant">
                              Empty Slot
                            </span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex justify-between text-[10px] text-on-surface-variant font-medium px-4">
                  <span>
                    {filledSlots.length > 0
                      ? `Research Quality: ${filledSlots
                          .map((c) => {
                            const { q1 } = pubQualityCounts(c);
                            return `${candidateFirstName(c)} (${q1 >= 5 ? "High" : q1 >= 2 ? "Moderate" : "Low"})`;
                          })
                          .join(", ")}`
                      : "Select candidates to compare"}
                  </span>
                  <span>Data updated live</span>
                </div>
              </div>
            </>
          )}

          {/* ── Empty state ── */}
          {filledSlots.length === 0 && (
            <div className="text-center py-20 text-on-surface-variant">
              <span className="material-symbols-outlined text-5xl mb-4 block">
                compare_arrows
              </span>
              <p className="text-lg font-semibold">
                Select candidates to compare
              </p>
              <p className="text-sm mt-1">
                Click a slot above or the &ldquo;Add Candidate&rdquo; button to
                get started
              </p>
            </div>
          )}
        </div>
      </main>

      {/* ── Candidate picker modal ── */}
      {pickerSlot !== null && (
        <CandidatePicker
          candidates={candidateList}
          alreadySelected={alreadySelected}
          onSelect={handleSelect}
          onClose={() => setPickerSlot(null)}
        />
      )}

      {/* ── Share FAB ── */}
      {filledSlots.length >= 2 && (
        <button className="fixed bottom-8 right-8 w-14 h-14 bg-indigo-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-50">
          <span className="material-symbols-outlined">ios_share</span>
        </button>
      )}
    </div>
  );
}
