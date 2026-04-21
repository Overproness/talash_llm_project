"use client";

import Sidebar from "@/components/ui/Sidebar";
import TopBar from "@/components/ui/TopBar";
import { api } from "@/lib/api";
import { CandidateListItem, EmailDraft } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function EmailDraftsPage() {
  const [candidates, setCandidates] = useState<CandidateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, EmailDraft>>({});
  const [generating, setGenerating] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    api
      .getCandidates(0, 100)
      .then((data) =>
        setCandidates(data.filter((c) => c.missing_fields_count > 0)),
      )
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleExpand = async (id: string) => {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    if (!drafts[id]) {
      setGenerating(id);
      try {
        const draft = await api.getEmailDraft(id);
        setDrafts((prev) => ({ ...prev, [id]: draft }));
      } catch (e) {
        console.error(e);
      } finally {
        setGenerating(null);
      }
    }
  };

  const handleRegenerate = async (id: string) => {
    setGenerating(id);
    try {
      const draft = await api.getEmailDraft(id);
      setDrafts((prev) => ({ ...prev, [id]: draft }));
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(null);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="ml-[220px] flex-1">
        <TopBar />
        <div className="pt-24 px-8 pb-12">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-on-surface">
              Email Drafts
            </h1>
            <p className="text-on-surface-variant mt-1 text-sm">
              LLM-powered personalized emails for candidates with missing information
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <span className="material-symbols-outlined animate-spin text-primary text-3xl">
                refresh
              </span>
            </div>
          ) : candidates.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-2xl p-12 text-center shadow-sm">
              <span className="material-symbols-outlined text-4xl text-emerald-500 mb-3 block">
                mark_email_read
              </span>
              <h3 className="font-semibold text-on-surface mb-1">
                No emails needed
              </h3>
              <p className="text-sm text-on-surface-variant">
                All candidates have complete profiles.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {candidates.map((c) => {
                const draft = drafts[c.id];
                const isGenerating = generating === c.id;
                const isCopied = copied === c.id;

                return (
                  <div
                    key={c.id}
                    className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden"
                  >
                    <div
                      className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-surface-container-low transition-colors"
                      onClick={() => handleExpand(c.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-bold text-sm">
                          {(c.name || "U").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-on-surface">
                            {c.name || c.filename}
                          </p>
                          <p className="text-xs text-on-surface-variant">
                            {c.missing_fields_count} missing field(s)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {draft && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-3 py-1 rounded-full uppercase">
                            Draft Ready
                          </span>
                        )}
                        <span className="text-[10px] bg-error-container text-on-error-container font-bold px-3 py-1 rounded-full uppercase">
                          Needs Info
                        </span>
                        <span className="material-symbols-outlined text-outline text-sm">
                          {expanded === c.id ? "expand_less" : "expand_more"}
                        </span>
                      </div>
                    </div>

                    {expanded === c.id && (
                      <div className="px-6 pb-6">
                        {isGenerating ? (
                          <div className="bg-surface-container rounded-xl p-8 flex flex-col items-center gap-3">
                            <span className="material-symbols-outlined animate-spin text-primary text-2xl">
                              refresh
                            </span>
                            <p className="text-sm text-on-surface-variant">
                              Generating personalized email with AI...
                            </p>
                          </div>
                        ) : draft ? (
                          <>
                            {/* Email header */}
                            <div className="bg-surface-container rounded-t-xl px-5 py-3 flex items-center gap-6">
                              <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                                <span className="material-symbols-outlined text-sm">person</span>
                                <span>To: {draft.candidate_email || "No email on file"}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs font-medium text-on-surface">
                                <span className="material-symbols-outlined text-sm">subject</span>
                                <span>{draft.subject}</span>
                              </div>
                            </div>

                            {/* Email body */}
                            <div className="bg-surface-container rounded-b-xl px-5 py-5 border-t border-outline-variant/10">
                              <pre className="text-sm text-on-surface whitespace-pre-wrap font-sans leading-relaxed">
                                {draft.body}
                              </pre>
                            </div>

                            {/* Missing items list */}
                            {draft.missing_items.length > 0 && (
                              <div className="mt-3 bg-amber-50 rounded-xl px-5 py-3">
                                <p className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-2">
                                  Missing Items Referenced
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {draft.missing_items.map((item, i) => (
                                    <span
                                      key={i}
                                      className="text-[11px] bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full"
                                    >
                                      {item}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-4 mt-4">
                              <button
                                onClick={() =>
                                  handleCopy(
                                    c.id,
                                    `Subject: ${draft.subject}\n\n${draft.body}`,
                                  )
                                }
                                className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors"
                              >
                                <span className="material-symbols-outlined text-sm">
                                  {isCopied ? "check" : "content_copy"}
                                </span>
                                {isCopied ? "Copied!" : "Copy Email"}
                              </button>
                              <button
                                onClick={() => handleRegenerate(c.id)}
                                className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors"
                              >
                                <span className="material-symbols-outlined text-sm">
                                  refresh
                                </span>
                                Regenerate
                              </button>
                              <Link
                                href={`/candidates/${c.id}`}
                                className="flex items-center gap-2 text-sm text-primary hover:underline"
                              >
                                <span className="material-symbols-outlined text-sm">
                                  person
                                </span>
                                View Profile
                              </Link>
                              {draft.candidate_email && (
                                <a
                                  href={`mailto:${draft.candidate_email}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`}
                                  className="flex items-center gap-2 text-sm text-primary hover:underline ml-auto"
                                >
                                  <span className="material-symbols-outlined text-sm">
                                    send
                                  </span>
                                  Open in Mail Client
                                </a>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="bg-surface-container rounded-xl p-8 text-center">
                            <p className="text-sm text-on-surface-variant mb-3">
                              Failed to generate email draft.
                            </p>
                            <button
                              onClick={() => handleRegenerate(c.id)}
                              className="px-4 py-2 rounded-lg primary-gradient text-white text-sm font-semibold"
                            >
                              Try Again
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
