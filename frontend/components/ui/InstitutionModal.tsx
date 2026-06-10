"use client";

import { EducationAnalysis } from "@/lib/types";

type InstitutionQualityItem = NonNullable<
  EducationAnalysis["institution_quality"]
>[number];

interface InstitutionModalProps {
  item: InstitutionQualityItem | null;
  onClose: () => void;
}

export function InstitutionModal({ item, onClose }: InstitutionModalProps) {
  if (!item) return null;

  const hasRankings =
    (item.qs_rank && item.qs_rank !== "unranked" && item.qs_rank !== "") ||
    (item.the_rank && item.the_rank !== "unranked" && item.the_rank !== "") ||
    (item.hec_category &&
      item.hec_category !== "N/A" &&
      item.hec_category !== "");

  const hecColors: Record<string, string> = {
    W: "bg-emerald-100 text-emerald-800 border border-emerald-300",
    X: "bg-blue-100 text-blue-800 border border-blue-300",
    Y: "bg-amber-100 text-amber-800 border border-amber-300",
    Z: "bg-surface-container text-on-surface-variant border border-outline-variant",
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Panel */}
      <div
        className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-outline-variant/20 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-on-surface leading-tight">
              {item.matched_name || item.institution}
            </h2>
            {item.matched_name && item.matched_name !== item.institution && (
              <p className="text-xs text-on-surface-variant mt-0.5">
                Listed as: {item.institution}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] bg-primary-fixed text-on-primary-fixed font-bold px-2 py-0.5 rounded-full uppercase">
                {item.level}
              </span>
              {item.degree && (
                <span className="text-[10px] text-on-surface-variant">
                  {item.degree}
                </span>
              )}
              {item.tier && item.tier !== "" && (
                <span className="text-[10px] bg-surface-container text-on-surface-variant font-medium px-2 py-0.5 rounded-full capitalize">
                  {item.tier} tier
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-container transition-colors flex-shrink-0 text-on-surface-variant"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Rankings grid */}
          {hasRankings ? (
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">
                Rankings &amp; Recognition
              </p>
              <div className="grid grid-cols-3 gap-3">
                {/* HEC */}
                {item.hec_category &&
                  item.hec_category !== "N/A" &&
                  item.hec_category !== "" && (
                    <div className="bg-surface-container rounded-xl p-4 text-center">
                      <span
                        className={`inline-block text-lg font-bold px-3 py-1 rounded-full ${hecColors[item.hec_category] ?? hecColors["Z"]}`}
                      >
                        {item.hec_category}
                      </span>
                      <p className="text-[10px] text-outline uppercase mt-2">
                        HEC Category
                      </p>
                    </div>
                  )}

                {/* QS */}
                {item.qs_rank &&
                  item.qs_rank !== "unranked" &&
                  item.qs_rank !== "" && (
                    <div className="bg-surface-container rounded-xl p-4 text-center">
                      <span className="text-lg font-bold text-violet-700">
                        #{item.qs_rank}
                      </span>
                      <p className="text-[10px] text-outline uppercase mt-2">
                        QS World
                      </p>
                    </div>
                  )}

                {/* THE */}
                {item.the_rank &&
                  item.the_rank !== "unranked" &&
                  item.the_rank !== "" && (
                    <div className="bg-surface-container rounded-xl p-4 text-center">
                      <span className="text-lg font-bold text-sky-700">
                        #{item.the_rank}
                      </span>
                      <p className="text-[10px] text-outline uppercase mt-2">
                        THE World
                      </p>
                    </div>
                  )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-surface-container rounded-xl p-4">
              <span className="material-symbols-outlined text-outline text-xl">
                info
              </span>
              <p className="text-sm text-on-surface-variant">
                No ranking data found for this institution.
              </p>
            </div>
          )}

          {/* Ranking narrative */}
          {item.ranking_info && item.ranking_info.trim() !== "" && (
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                Notes
              </p>
              <p className="text-sm text-on-surface leading-relaxed">
                {item.ranking_info}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-outline-variant/20 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg border border-outline-variant text-on-surface-variant font-semibold text-sm hover:bg-surface-container transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}