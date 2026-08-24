import { apiGet } from "@/lib/api"
import type { VacancyMatch } from "@/features/vacancies/types"

type VacancySource = {
  code: string
  name: string
  icon_url: string | null
}

type Vacancy = {
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
