import { apiGet, apiPatchJson } from "@/lib/api"
import type { VacancyMatch } from "@/features/vacancies/types"

type VacancySource = {
  code: string
  name: string
  icon_url: string | null
}

export type Vacancy = {
  id: number
  title: string
  company: string | null
  location: string | null
  posted_date: string | null
  scraped_at: string
  source_updated_at: string | null
  is_deftech: boolean
  source: VacancySource
  url: string | null
  match: VacancyMatch | null
  saved: boolean
  hidden: boolean
  seen: boolean
  has_note: boolean
  application_submitted_at: string | null
}

export type VacancyDetail = Vacancy & {
  description: string
  description_status: "markdown" | "source"
}

export type FeedResponse = {
  items: Vacancy[]
  next_cursor: string | null
}

export type FeedMode = "active" | "saved" | "hidden"
export type VacancyState = Pick<Vacancy, "saved" | "hidden" | "seen">
export type VacancyStatePatch =
  { saved: boolean } | { hidden: boolean } | { seen: true }

const FEED_PAGE_SIZE = 20

export function fetchFeed(
  mode: FeedMode,
  cursor: string | null,
  signal?: AbortSignal,
) {
  const query = new URLSearchParams({
    limit: String(FEED_PAGE_SIZE),
    mode,
  })
  if (cursor) query.set("cursor", cursor)
  return apiGet<FeedResponse>(`feed?${query}`, { signal })
}

export function fetchFeedDetail(id: number, signal?: AbortSignal) {
  return apiGet<VacancyDetail>(`feed/${id}`, { signal })
}

export function updateVacancyState(id: number, patch: VacancyStatePatch) {
  return apiPatchJson<VacancyState, VacancyStatePatch>(
    `feed/${id}/state`,
    patch,
  )
}
