'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/ui/Sidebar'
import TopBar from '@/components/ui/TopBar'
import { api } from '@/lib/api'
import { CandidateFull } from '@/lib/types'

type Tab = 'overview' | 'education' | 'experience' | 'publications' | 'skills' | 'raw'

export default function CandidateProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [candidate, setCandidate] = useState<CandidateFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('overview')

  useEffect(() => {
    if (!id) return
    api.getCandidate(id)
      .then(setCandidate)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="ml-[220px] flex-1 flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">refresh</span>
      </main>
    </div>
  )

  if (!candidate) return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="ml-[220px] flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-on-surface-variant mb-4">Candidate not found.</p>
          <Link href="/candidates" className="text-primary underline">← Back</Link>
        </div>
      </main>
    </div>
  )

  const pi = candidate.personal_info
  const initials = pi.name
    ? pi.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : candidate.filename.slice(0, 2).toUpperCase()

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'education', label: 'Education' },
    { key: 'experience', label: 'Experience' },
    { key: 'publications', label: 'Publications' },
    { key: 'skills', label: 'Skills' },
    { key: 'raw', label: 'Raw CV' },
  ]

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="ml-[220px] flex-1">
        <TopBar breadcrumb={['TALASH', 'Candidates', pi.name || candidate.filename]} />
        <div className="pt-24 px-10 pb-12 space-y-8">

          {/* Missing info banner */}
          {candidate.missing_fields.length > 0 && (
            <div className="bg-tertiary-fixed text-on-tertiary-fixed px-6 py-3 rounded-xl flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined">warning</span>
                <span className="font-medium">Missing information detected — {candidate.missing_fields.length} field(s) incomplete</span>
              </div>
              <Link href="/email-drafts" className="text-on-tertiary-fixed-variant font-bold underline decoration-2 underline-offset-4">
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
                <h1 className="text-2xl font-bold text-on-surface">{pi.name || candidate.filename}</h1>
                {candidate.experience.length > 0 && (
                  <p className="text-on-surface-variant text-sm">
                    {candidate.experience[0].title} • {candidate.experience[0].organization}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-4 text-xs text-outline mt-2">
                  {pi.email && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">mail</span>{pi.email}</span>}
                  {pi.phone && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">call</span>{pi.phone}</span>}
                  {pi.location && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">location_on</span>{pi.location}</span>}
                </div>
                <div className="flex gap-2 mt-2">
                  <span className="text-[10px] bg-primary-fixed text-on-primary-fixed px-2 py-1 rounded-full font-bold">{candidate.extraction_method === 'llm' ? '🤖 LLM Extracted' : '⚙️ Rule-based'}</span>
                  <span className="text-[10px] bg-surface-container text-on-surface-variant px-2 py-1 rounded-full">{candidate.education.length} education records</span>
                  <span className="text-[10px] bg-surface-container text-on-surface-variant px-2 py-1 rounded-full">{candidate.publications.length} publications</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-4">
              {candidate.overall_score != null && (
                <div className="text-right">
                  <span className="block text-[10px] text-outline uppercase tracking-widest">Overall Score</span>
                  <span className="text-5xl font-bold text-primary">{candidate.overall_score}</span>
                </div>
              )}
              <div className="flex gap-3">
                <button className="px-5 py-2 rounded-lg border border-outline-variant text-on-surface-variant font-semibold text-sm hover:bg-surface-container-low transition-all">
                  Export PDF
                </button>
                <button className="px-5 py-2 rounded-lg primary-gradient text-white font-semibold text-sm shadow-md">
                  Draft Email
                </button>
              </div>
            </div>
          </section>

          {/* Tab nav */}
          <nav className="flex gap-6 border-b border-outline-variant/20">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`pb-4 font-medium text-sm transition-colors ${
                  tab === t.key
                    ? 'text-primary border-b-2 border-primary -mb-px font-bold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {/* Tab content */}
          {tab === 'overview' && (
            <div className="grid grid-cols-3 gap-6">
              {/* Quick stats */}
              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
                <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">Profile Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-on-surface-variant">Education Records</span><span className="font-semibold">{candidate.education.length}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-on-surface-variant">Experience Records</span><span className="font-semibold">{candidate.experience.length}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-on-surface-variant">Publications</span><span className="font-semibold">{candidate.publications.length}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-on-surface-variant">Skills</span><span className="font-semibold">{candidate.skills.length}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-on-surface-variant">Books</span><span className="font-semibold">{candidate.books.length}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-on-surface-variant">Patents</span><span className="font-semibold">{candidate.patents.length}</span></div>
                </div>
              </div>

              {/* Missing fields */}
              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
                <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">Missing Fields</h3>
                {candidate.missing_fields.length === 0 ? (
                  <p className="text-sm text-emerald-600 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    No missing fields detected
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {candidate.missing_fields.slice(0, 8).map((f, i) => (
                      <li key={i} className="text-xs text-on-surface-variant flex items-center gap-2">
                        <span className="material-symbols-outlined text-error text-sm">info</span>
                        {f}
                      </li>
                    ))}
                    {candidate.missing_fields.length > 8 && (
                      <li className="text-xs text-outline">+{candidate.missing_fields.length - 8} more</li>
                    )}
                  </ul>
                )}
              </div>

              {/* Skills cloud */}
              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
                <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {candidate.skills.slice(0, 15).map((s, i) => (
                    <span key={i} className="text-[11px] bg-primary-fixed text-on-primary-fixed px-2 py-1 rounded-full font-medium">{s}</span>
                  ))}
                  {candidate.skills.length === 0 && <p className="text-xs text-on-surface-variant">No skills extracted</p>}
                </div>
              </div>
            </div>
          )}

          {tab === 'education' && (
            <div className="space-y-4">
              {candidate.education.length === 0 ? (
                <p className="text-on-surface-variant text-sm">No education records found.</p>
              ) : candidate.education.map((edu, i) => (
                <div key={i} className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] bg-primary-fixed text-on-primary-fixed font-bold px-2 py-0.5 rounded-full uppercase">{edu.level}</span>
                      <h3 className="font-semibold text-on-surface mt-2">{edu.degree}</h3>
                      {edu.specialization && <p className="text-sm text-on-surface-variant">{edu.specialization}</p>}
                      <p className="text-sm text-on-surface-variant mt-1">{edu.institution || 'Institution not specified'}</p>
                      {edu.board_or_affiliation && <p className="text-xs text-outline">{edu.board_or_affiliation}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-on-surface-variant">{edu.start_year} — {edu.end_year ?? 'Present'}</p>
                      {edu.marks_or_cgpa && (
                        <p className="text-sm font-semibold text-on-surface mt-1">{edu.marks_or_cgpa}</p>
                      )}
                      {edu.normalized_score != null && (
                        <p className="text-xs text-outline">Normalized: {edu.normalized_score.toFixed(1)}%</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'experience' && (
            <div className="space-y-4">
              {candidate.experience.length === 0 ? (
                <p className="text-on-surface-variant text-sm">No experience records found.</p>
              ) : candidate.experience.map((exp, i) => (
                <div key={i} className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-on-surface">{exp.title}</h3>
                      <p className="text-sm text-on-surface-variant">{exp.organization}</p>
                      {exp.employment_type && (
                        <span className="text-[10px] bg-surface-container text-on-surface-variant font-medium px-2 py-0.5 rounded-full mt-1 inline-block">
                          {exp.employment_type}
                        </span>
                      )}
                      {exp.description && <p className="text-xs text-on-surface-variant mt-2">{exp.description.slice(0, 200)}</p>}
                    </div>
                    <p className="text-sm text-on-surface-variant text-right">{exp.start_date} — {exp.end_date || 'Present'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'publications' && (
            <div className="space-y-3">
              {candidate.publications.length === 0 ? (
                <p className="text-on-surface-variant text-sm">No publications found.</p>
              ) : candidate.publications.map((pub, i) => (
                <div key={i} className="bg-surface-container-lowest rounded-xl px-5 py-4 shadow-sm">
                  <div className="flex items-start gap-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex-shrink-0 ${pub.pub_type === 'journal' ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-tertiary-fixed text-on-tertiary-fixed'}`}>
                      {pub.pub_type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-on-surface">{pub.title}</p>
                      {pub.venue && <p className="text-xs text-on-surface-variant mt-1">{pub.venue}</p>}
                      <div className="flex gap-3 mt-1">
                        {pub.year && <span className="text-[11px] text-outline">{pub.year}</span>}
                        {pub.doi && <span className="text-[11px] text-primary">{pub.doi}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'skills' && (
            <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-sm">
              {candidate.skills.length === 0 ? (
                <p className="text-on-surface-variant text-sm">No skills extracted.</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {candidate.skills.map((skill, i) => (
                    <span key={i} className="bg-primary-fixed text-on-primary-fixed text-sm font-medium px-4 py-2 rounded-full">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'raw' && (
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
              <pre className="text-xs text-on-surface-variant whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">
                {candidate.raw_text || 'No raw text available.'}
              </pre>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
