import { apiGet } from "@/lib/api"

type VacancySource = {
  code: string
  name: string
}

type Vacancy = {
  id: number
  title: string
  company: string | null
  location: string | null
  posted_date: string | null
  source: VacancySource
  url: string | null
}

export type FeedResponse = {
  items: Vacancy[]
  count: number
}

export const FEED_PAGE_SIZE = 20

export function fetchFeed(page: number, signal?: AbortSignal) {
  return apiGet<FeedResponse>(`feed?page=${page}&page_size=${FEED_PAGE_SIZE}`, {
    signal,
  })
}
