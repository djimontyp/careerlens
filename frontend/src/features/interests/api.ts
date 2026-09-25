import {
  apiDelete,
  ApiError,
  apiGet,
  apiPatchJson,
  apiPostJson,
} from "@/lib/api"

export type Source = { code: string; name: string; icon_url: string | null }

export type Interest = {
  id: number
  name: string
  keywords: string[]
  stop_words: string[]
  sources: Source[]
  is_active: boolean
  created_at: string
}

export type InterestsResponse = { items: Interest[]; limit: number }

export type InterestInput = {
  name: string
  keywords: string[]
  stop_words: string[]
  sources: string[]
}

export type InterestPatch = Partial<InterestInput> & { is_active?: boolean }

export type ValidationIssue = {
  type: string
  loc: (string | number)[]
  msg: string
  ctx?: Record<string, unknown>
}

export function fetchInterests(
  signal?: AbortSignal,
): Promise<InterestsResponse> {
  return apiGet<InterestsResponse>("interests", { signal })
}

export function fetchSources(signal?: AbortSignal): Promise<Source[]> {
  return apiGet<Source[]>("sources", { signal })
}

export function createInterest(input: InterestInput): Promise<Interest> {
  return apiPostJson<Interest, InterestInput>("interests", input)
}

export function updateInterest(
  id: number,
  patch: InterestPatch,
): Promise<Interest> {
  return apiPatchJson<Interest, InterestPatch>(`interests/${id}`, patch)
}

export function deleteInterest(id: number): Promise<void> {
  return apiDelete(`interests/${id}`)
}

export function validationIssues(error: unknown): ValidationIssue[] {
  if (!(error instanceof ApiError) || error.status !== 422) return []
  const detail = (error.detail as { detail?: unknown } | undefined)?.detail
  return Array.isArray(detail) ? (detail as ValidationIssue[]) : []
}
