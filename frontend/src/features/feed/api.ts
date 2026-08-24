import { apiGet, apiPostJson } from "@/lib/api"
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
}

export type VacancyDetail = Vacancy & {
  description: string
  description_status: "markdown" | "source"
}

export type FeedResponse = {
  items: Vacancy[]
  next_cursor: string | null
}

const FEED_PAGE_SIZE = 20

export function fetchFeed(cursor: string | null, signal?: AbortSignal) {
  const query = new URLSearchParams({ limit: String(FEED_PAGE_SIZE) })
  if (cursor) query.set("cursor", cursor)
  return apiGet<FeedResponse>(`feed?${query}`, { signal })
}

export function fetchFeedDetail(id: number, signal?: AbortSignal) {
  return apiGet<VacancyDetail>(`feed/${id}`, { signal })
}

export function setVacancySaved(id: number, saved: boolean) {
  return apiPostJson<{ saved: boolean }, { saved: boolean }>(
    `feed/${id}/saved`,
    { saved },
  )
}

export function setVacancyHidden(id: number, hidden: boolean) {
  return apiPostJson<{ hidden: boolean }, { hidden: boolean }>(
    `feed/${id}/hidden`,
    { hidden },
  )
}
