'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/ui/Sidebar'
import TopBar from '@/components/ui/TopBar'
import { api } from '@/lib/api'
import { CandidateListItem } from '@/lib/types'

export default function EmailDraftsPage() {
  const [candidates, setCandidates] = useState<CandidateListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    api.getCandidates(0, 100)
      .then(data => setCandidates(data.filter(c => c.missing_fields_count > 0)))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const generateDraft = (c: CandidateListItem) => `Dear ${c.name || 'Candidate'},

We are reviewing your application for a position at our institution. After reviewing your submitted CV, we noticed that the following information is incomplete or missing:

${`• ${c.missing_fields_count} field(s) require clarification (see candidate profile for details).`}

To complete your application assessment, we kindly request that you provide the missing information at your earliest convenience.

Please respond with an updated CV or provide the requested details via email.

If you have any questions, please do not hesitate to contact our HR team.

Best regards,
TALASH Recruitment System
Smart HR Recruitment Team`

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="ml-[220px] flex-1">
        <TopBar />
        <div className="pt-24 px-8 pb-12">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-on-surface">Email Drafts</h1>
            <p className="text-on-surface-variant mt-1 text-sm">
              Personalized draft emails for candidates with missing information
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <span className="material-symbols-outlined animate-spin text-primary text-3xl">refresh</span>
            </div>
          ) : candidates.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-2xl p-12 text-center shadow-sm">
              <span className="material-symbols-outlined text-4xl text-emerald-500 mb-3 block">mark_email_read</span>
              <h3 className="font-semibold text-on-surface mb-1">No emails needed</h3>
              <p className="text-sm text-on-surface-variant">All candidates have complete profiles.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {candidates.map(c => (
                <div key={c.id} className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden">
                  <div
                    className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-surface-container-low transition-colors"
                    onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-bold text-sm">
                        {(c.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-on-surface">{c.name || c.filename}</p>
                        <p className="text-xs text-on-surface-variant">{c.missing_fields_count} missing field(s)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] bg-error-container text-on-error-container font-bold px-3 py-1 rounded-full uppercase">
                        Needs Info
                      </span>
                      <span className="material-symbols-outlined text-outline text-sm">
                        {expanded === c.id ? 'expand_less' : 'expand_more'}
                      </span>
                    </div>
                  </div>

                  {expanded === c.id && (
                    <div className="px-6 pb-6">
                      <div className="bg-surface-container rounded-xl p-5">
                        <pre className="text-sm text-on-surface whitespace-pre-wrap font-sans leading-relaxed">
                          {generateDraft(c)}
                        </pre>
                      </div>
                      <div className="flex gap-3 mt-4">
                        <button
                          onClick={() => navigator.clipboard.writeText(generateDraft(c))}
                          className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">content_copy</span> Copy
                        </button>
                        <Link
                          href={`/candidates/${c.id}`}
                          className="flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <span className="material-symbols-outlined text-sm">person</span> View Profile
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
