'use client'

import { useEffect, useState } from 'react'
import Sidebar from '@/components/ui/Sidebar'
import TopBar from '@/components/ui/TopBar'
import { api, LLMSettings } from '@/lib/api'

const PROVIDER_ICONS: Record<string, string> = {
  ollama: '🦙',
  gemini: '♊',
  openai: '🤖',
  grok:   '⚡',
}

export default function SettingsPage() {
  const [health, setHealth] = useState<{ status: string; ollama: string } | null>(null)
  const [llm, setLlm] = useState<LLMSettings | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    api.health().then(setHealth).catch(console.error)
    api.getLLMSettings().then(s => {
      setLlm(s)
      setSelectedProvider(s.active_provider)
      setSelectedModel(s.active_model)
    }).catch(console.error)
  }, [])

  const handleProviderChange = (p: string) => {
    setSelectedProvider(p)
    // Reset to first suggested model for that provider
    const models = llm?.providers[p]?.models ?? []
    setSelectedModel(models[0] ?? '')
    setSaveMsg(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg(null)
    try {
      const result = await api.setLLMProvider(selectedProvider, selectedModel)
      setLlm(prev => prev ? {
        ...prev,
        active_provider: result.active_provider,
        active_model: result.active_model,
        available: result.available,
      } : prev)
      setSaveMsg({ ok: true, text: `Switched to ${result.active_provider} — ${result.available ? 'online' : 'configured (offline)'}` })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setSaveMsg({ ok: false, text: msg })
    } finally {
      setSaving(false)
    }
  }

  const isDirty = selectedProvider !== llm?.active_provider || selectedModel !== llm?.active_model

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="ml-[220px] flex-1">
        <TopBar />
        <div className="pt-24 px-8 pb-12">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-on-surface">Settings</h1>
            <p className="text-on-surface-variant mt-1 text-sm">System configuration and LLM provider</p>
          </div>

          <div className="space-y-6 max-w-2xl">

            {/* System Status */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
              <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-5">System Status</h2>
              <div className="space-y-4">
                {[
                  { label: 'API Backend', value: health?.status === 'ok' ? 'Connected' : 'Checking…', ok: health?.status === 'ok' },
                  {
                    label: 'Active LLM',
                    value: llm
                      ? `${llm.providers[llm.active_provider]?.label ?? llm.active_provider} — ${llm.active_model} — ${llm.available ? 'online' : 'offline'}`
                      : 'Loading…',
                    ok: llm?.available ?? false,
                  },
                  { label: 'PDF Parser', value: 'PyMuPDF + pdfplumber', ok: true },
                  { label: 'Database',   value: 'MongoDB Atlas', ok: true },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-sm text-on-surface">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.ok ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      <span className="text-sm text-on-surface-variant">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Provider switcher */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
              <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-5">LLM Provider</h2>

              {/* Provider cards */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {llm && Object.entries(llm.providers).map(([key, info]) => {
                  const configured = llm.configured[key]
                  const active = selectedProvider === key
                  return (
                    <button
                      key={key}
                      onClick={() => handleProviderChange(key)}
                      className={`text-left p-4 rounded-xl border-2 transition-all ${
                        active
                          ? 'border-primary bg-primary/5'
                          : 'border-outline-variant/30 hover:border-outline-variant/60 bg-surface-container'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-lg">{PROVIDER_ICONS[key] ?? '🔮'}</span>
                        <div className="flex gap-1">
                          {configured && (
                            <span className="text-[9px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded-full uppercase">
                              Key set
                            </span>
                          )}
                          {key === llm.active_provider && (
                            <span className="text-[9px] bg-primary-fixed text-on-primary-fixed font-bold px-1.5 py-0.5 rounded-full uppercase">
                              Active
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-on-surface block">{info.label}</span>
                      {info.requires_key && !configured && (
                        <span className="text-[10px] text-amber-600 mt-0.5 block">Needs {info.key_env} in .env</span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Model selector */}
              {llm && (
                <div className="mb-5">
                  <label className="text-xs text-on-surface-variant uppercase tracking-widest font-bold block mb-2">Model</label>
                  <select
                    value={selectedModel}
                    onChange={e => setSelectedModel(e.target.value)}
                    className="w-full bg-surface-container-low rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                  >
                    {(llm.providers[selectedProvider]?.models ?? [selectedModel]).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                    {/* allow custom model entry */}
                    {selectedModel && !llm.providers[selectedProvider]?.models.includes(selectedModel) && (
                      <option value={selectedModel}>{selectedModel} (custom)</option>
                    )}
                  </select>
                  <input
                    className="mt-2 w-full bg-surface-container-low rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20 text-on-surface-variant"
                    placeholder="Or type a custom model name…"
                    value={selectedModel}
                    onChange={e => setSelectedModel(e.target.value)}
                  />
                </div>
              )}

              {/* Save button */}
              <div className="flex items-center gap-4">
                <button
                  onClick={handleSave}
                  disabled={!isDirty || saving}
                  className="primary-gradient text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-md disabled:opacity-40 transition-opacity"
                >
                  {saving ? 'Switching…' : 'Apply Provider'}
                </button>
                {saveMsg && (
                  <span className={`text-sm ${saveMsg.ok ? 'text-emerald-600' : 'text-error'}`}>
                    {saveMsg.ok ? '✓' : '✗'} {saveMsg.text}
                  </span>
                )}
              </div>
            </div>

            {/* Setup guide */}
            <div className="bg-surface-container rounded-2xl p-6 border-l-4 border-primary">
              <h3 className="font-semibold text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">info</span>
                Provider Setup Guide
              </h3>
              <div className="space-y-3 text-sm text-on-surface-variant">
                <div>
                  <p className="font-semibold text-on-surface mb-1">🦙 Ollama (local, free)</p>
                  <code className="text-xs text-primary block">winget install Ollama.Ollama</code>
                  <code className="text-xs text-primary block">ollama pull llama3.2:3b</code>
                </div>
                <div>
                  <p className="font-semibold text-on-surface mb-1">♊ Google Gemini</p>
                  <p>Add <code className="text-primary">GOOGLE_API_KEY=your_key</code> to backend/.env</p>
                  <p className="text-xs text-outline">Get key at aistudio.google.com/app/apikey</p>
                </div>
                <div>
                  <p className="font-semibold text-on-surface mb-1">🤖 OpenAI</p>
                  <p>Add <code className="text-primary">OPENAI_API_KEY=sk-…</code> to backend/.env</p>
                </div>
                <div>
                  <p className="font-semibold text-on-surface mb-1">⚡ Grok (xAI)</p>
                  <p>Add <code className="text-primary">XAI_API_KEY=xai-…</code> to backend/.env</p>
                  <p className="text-xs text-outline">Uses OpenAI-compatible endpoint at api.x.ai/v1</p>
                </div>
              </div>
              <p className="text-xs text-outline mt-4 pt-3 border-t border-outline-variant/20">
                Provider switches take effect immediately — no server restart needed.
                When all providers are unavailable, rule-based regex extraction is used automatically.
              </p>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}

