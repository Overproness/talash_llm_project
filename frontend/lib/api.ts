import { CandidateFull, CandidateListItem, UploadResponse } from './types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`API ${res.status}: ${err}`)
  }
  return res.json() as Promise<T>
}

export interface LLMProvider {
  label: string
  requires_key: boolean
  key_env?: string
  models: string[]
}

export interface LLMSettings {
  active_provider: string
  active_model: string
  available: boolean
  providers: Record<string, LLMProvider>
  configured: Record<string, boolean>
}

export const api = {
  health: () => request<{ status: string; ollama: string }>('/health'),

  uploadCV: async (file: File): Promise<UploadResponse> => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: form })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Upload failed ${res.status}: ${err}`)
    }
    return res.json()
  },

  getCandidates: (skip = 0, limit = 50) =>
    request<CandidateListItem[]>(`/candidates?skip=${skip}&limit=${limit}`),

  getCandidate: (id: string) => request<CandidateFull>(`/candidates/${id}`),

  deleteCandidate: (id: string) =>
    request<{ message: string }>(`/candidates/${id}`, { method: 'DELETE' }),

  getLLMSettings: () => request<LLMSettings>('/settings/llm'),

  setLLMProvider: (provider: string, model: string) =>
    request<{ active_provider: string; active_model: string; available: boolean }>(
      '/settings/llm',
      {
        method: 'POST',
        body: JSON.stringify({ provider, model }),
      }
    ),
}
