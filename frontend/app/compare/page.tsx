'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/ui/Sidebar'
import TopBar from '@/components/ui/TopBar'
import { api } from '@/lib/api'
import { CandidateFull, CandidateListItem } from '@/lib/types'

export default function ComparePage() {
  const [candidates, setCandidates] = useState<CandidateListItem[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [details, setDetails] = useState<CandidateFull[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.getCandidates(0, 100).then(setCandidates).catch(console.error)
  }, [])

  const toggleSelect = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev
    )
  }

  const compare = async () => {
    setLoading(true)
    try {
      const results = await Promise.all(selected.map(id => api.getCandidate(id)))
      setDetails(results)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="ml-[220px] flex-1">
        <TopBar />
        <div className="pt-24 px-8 pb-12">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-on-surface">Compare Candidates</h1>
            <p className="text-on-surface-variant mt-1 text-sm">Select up to 3 candidates for side-by-side comparison</p>
          </div>

          {details.length === 0 ? (
            <>
              <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden mb-6">
                <table className="w-full">
                  <thead>
                    <tr className="bg-surface-container">
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-on-surface-variant uppercase tracking-widest w-10"></th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Candidate</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Skills</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Publications</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.filter(c => c.processing_status === 'done').map(c => (
                      <tr key={c.id} className={`hover:bg-surface-container-low transition-colors ${selected.includes(c.id) ? 'bg-primary-fixed/10' : ''}`}>
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggleSelect(c.id)} className="accent-primary" />
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-on-surface">{c.name || c.filename}</td>
                        <td className="px-4 py-3 text-center text-sm">{c.skills_count}</td>
                        <td className="px-4 py-3 text-center text-sm">{c.publications_count}</td>
                        <td className="px-4 py-3 text-center text-sm text-primary font-bold">{c.overall_score ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={compare}
                disabled={selected.length < 2 || loading}
                className="primary-gradient text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-lg disabled:opacity-50"
              >
                {loading ? 'Loading…' : `Compare ${selected.length} Candidates`}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => { setDetails([]); setSelected([]) }} className="text-sm text-on-surface-variant hover:text-primary mb-6 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">arrow_back</span> Back to selection
              </button>
              <div className="grid gap-6 overflow-x-auto" style={{ gridTemplateColumns: `repeat(${details.length}, 1fr)` }}>
                {details.map(c => (
                  <div key={c.id} className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-bold text-xl mx-auto mb-3">
                        {(c.personal_info.name || 'U').charAt(0)}
                      </div>
                      <h3 className="font-bold text-on-surface">{c.personal_info.name || c.filename}</h3>
                      <p className="text-xs text-on-surface-variant">{c.personal_info.email}</p>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-on-surface-variant">Education</span><span className="font-medium">{c.education.length}</span></div>
                      <div className="flex justify-between"><span className="text-on-surface-variant">Experience</span><span className="font-medium">{c.experience.length}</span></div>
                      <div className="flex justify-between"><span className="text-on-surface-variant">Publications</span><span className="font-medium">{c.publications.length}</span></div>
                      <div className="flex justify-between"><span className="text-on-surface-variant">Skills</span><span className="font-medium">{c.skills.length}</span></div>
                      <div className="flex justify-between"><span className="text-on-surface-variant">Missing Fields</span><span className={c.missing_fields.length > 0 ? 'font-medium text-error' : 'font-medium text-emerald-600'}>{c.missing_fields.length}</span></div>
                    </div>
                    <Link href={`/candidates/${c.id}`} className="block text-center text-xs text-primary font-semibold hover:underline mt-2">
                      View Full Profile →
                    </Link>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
