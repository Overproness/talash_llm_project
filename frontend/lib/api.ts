import { CandidateFull, CandidateListItem, DashboardStats, EmailDraft, RankingResponse, Token, UploadResponse, UserPublic } from './types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : '/api'

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const token = localStorage.getItem('auth_token')
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const authHeaders = getAuthHeaders()
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders, ...options?.headers },
    ...options,
  })
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
      document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
      window.location.href = '/login'
    }
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`API ${res.status}: ${err}`)
  }
  return res.json() as Promise<T>
}

/** Used for public auth endpoints that never need a Bearer token. */
async function publicRequest<T>(path: string, options?: RequestInit): Promise<T> {
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
  // ── Auth ────────────────────────────────────────────────────────────────────
  signup: (full_name: string, email: string, password: string, confirm_password: string) =>
    publicRequest<Token>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ full_name, email, password, confirm_password }),
    }),

  login: (email: string, password: string) =>
    publicRequest<Token>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getMe: (token?: string) => {
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    return request<UserPublic>('/auth/me', { headers })
  },

  // ── Health ──────────────────────────────────────────────────────────────────
  health: () => request<{ status: string; ollama: string }>('/health'),

  // ── Upload ──────────────────────────────────────────────────────────────────
  uploadCV: async (file: File): Promise<UploadResponse> => {
    const form = new FormData()
    form.append('file', file)
    const authHeaders = getAuthHeaders()
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: { ...authHeaders },
      body: form,
    })
    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token')
        document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
        window.location.href = '/login'
      }
      throw new Error('Unauthorized')
    }
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Upload failed ${res.status}: ${err}`)
    }
    return res.json()
  },

  // ── Candidates ──────────────────────────────────────────────────────────────
  getCandidates: (skip = 0, limit = 50) =>
    request<CandidateListItem[]>(`/candidates?skip=${skip}&limit=${limit}`),

  getCandidate: (id: string) => request<CandidateFull>(`/candidates/${id}`),

  deleteCandidate: (id: string) =>
    request<{ message: string }>(`/candidates/${id}`, { method: 'DELETE' }),

  // ── Settings ─────────────────────────────────────────────────────────────────
  getLLMSettings: () => request<LLMSettings>('/settings/llm'),

  setLLMProvider: (provider: string, model: string) =>
    request<{ active_provider: string; active_model: string; available: boolean }>(
      '/settings/llm',
      {
        method: 'POST',
        body: JSON.stringify({ provider, model }),
      }
    ),

  // ── Analysis ─────────────────────────────────────────────────────────────────
  analyzeCandidate: (id: string) =>
    request<{ message: string; candidate_id: string; overall_score: number | null; summary: string }>(
      `/candidates/${id}/analyze`,
      { method: 'POST' }
    ),

  getEmailDraft: (id: string) =>
    request<{
      candidate_id: string
      has_missing_info: boolean
      email_draft: EmailDraft | null
      missing_count?: number
      message?: string
    }>(`/candidates/${id}/email-draft`, { method: 'POST' }),

  regenerateEmailDraft: (id: string) =>
    request<{
      candidate_id: string
      has_missing_info: boolean
      email_draft: EmailDraft | null
      missing_count?: number
      message?: string
    }>(`/candidates/${id}/email-draft?force=true`, { method: 'POST' }),

  getDashboardStats: () =>
    request<DashboardStats>('/dashboard/stats'),

  // ── Ranking ───────────────────────────────────────────────────────────────────
  rankCandidates: (limit = 50, minScore = 0) =>
    request<RankingResponse>(`/candidates/rank?limit=${limit}&min_score=${minScore}`),
}

