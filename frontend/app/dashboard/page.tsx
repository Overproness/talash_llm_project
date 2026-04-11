'use client'

import { useEffect, useState } from 'react'
import Sidebar from '@/components/ui/Sidebar'
import TopBar from '@/components/ui/TopBar'
import { api } from '@/lib/api'
import { CandidateListItem } from '@/lib/types'

export default function DashboardPage() {
  const [candidates, setCandidates] = useState<CandidateListItem[]>([])
  const [systemStatus, setSystemStatus] = useState<{ status: string; ollama: string } | null>(null)

  useEffect(() => {
    api.getCandidates(0, 100).then(setCandidates).catch(console.error)
    api.health().then(setSystemStatus).catch(console.error)
  }, [])

  const done = candidates.filter(c => c.processing_status === 'done')
  const processing = candidates.filter(c => c.processing_status === 'processing')
  const failed = candidates.filter(c => c.processing_status === 'failed')
  const withMissing = candidates.filter(c => c.missing_fields_count > 0)
  const totalPubs = done.reduce((s, c) => s + c.publications_count, 0)

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="ml-[220px] flex-1">
        <TopBar />
        <div className="pt-24 px-8 pb-12">
          <div className="mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-on-surface">Dashboard</h1>
              <p className="text-on-surface-variant mt-1 text-sm">Recruitment pipeline overview</p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className={`w-2 h-2 rounded-full ${systemStatus?.ollama === 'available' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className="text-on-surface-variant">
                AI Engine: {systemStatus?.ollama ?? '…'} 
              </span>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-6 mb-10">
            {[
              { icon: 'group', label: 'Total Candidates', value: candidates.length, color: 'bg-primary-fixed text-on-primary-fixed' },
              { icon: 'check_circle', label: 'Analyzed', value: done.length, color: 'bg-primary-fixed text-on-primary-fixed' },
              { icon: 'article', label: 'Publications Found', value: totalPubs, color: 'bg-tertiary-fixed text-on-tertiary-fixed' },
              { icon: 'warning', label: 'Missing Info', value: withMissing.length, color: 'bg-error-container text-on-error-container' },
            ].map(s => (
              <div key={s.label} className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2 rounded-lg ${s.color}`}>
                    <span className="material-symbols-outlined">{s.icon}</span>
                  </div>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">
                    {s.label}
                  </span>
                </div>
                <div className="text-4xl font-bold text-on-surface">{s.value}</div>
              </div>
            ))}
          </div>

          {/* System info */}
          <div className="grid grid-cols-3 gap-6">
            {/* Pipeline status */}
            <div className="col-span-2 bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-6">Processing Pipeline</h2>
              <div className="space-y-4">
                {[
                  { label: 'Text Extraction (PyMuPDF)', status: 'Operational', ok: true },
                  { label: 'Fallback Parser (pdfplumber)', status: 'Operational', ok: true },
                  { label: 'LLM Extraction (Ollama)', status: systemStatus?.ollama === 'available' ? 'Online' : 'Offline – Rule-based fallback active', ok: systemStatus?.ollama === 'available' },
                  { label: 'MongoDB Storage', status: done.length > 0 || candidates.length > 0 ? 'Connected' : 'Checking…', ok: true },
                  { label: 'CSV Export', status: 'Operational', ok: true },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${item.ok ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                      <span className="text-sm text-on-surface">{item.label}</span>
                    </div>
                    <span className={`text-xs font-medium ${item.ok ? 'text-emerald-600' : 'text-amber-600'}`}>{item.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent activity */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-6">Recent Uploads</h2>
              {candidates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <span className="material-symbols-outlined text-3xl text-outline mb-2">inbox</span>
                  <p className="text-sm text-on-surface-variant">No candidates yet.</p>
                  <p className="text-xs text-outline mt-1">Upload CVs from the Home page.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {candidates.slice(0, 5).map(c => (
                    <div key={c.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-bold text-xs flex-shrink-0">
                        {(c.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-on-surface truncate">{c.name || c.filename}</p>
                        <p className={`text-xs ${c.processing_status === 'done' ? 'text-emerald-600' : c.processing_status === 'failed' ? 'text-error' : 'text-amber-600'}`}>
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
  )
}
