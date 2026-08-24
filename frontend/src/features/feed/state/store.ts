import { create } from "zustand"

import type { Vacancy } from "@/features/feed/api"

type VacancyState = Pick<Vacancy, "saved" | "hidden" | "seen">

type FeedState = {
  overrides: Record<number, Partial<VacancyState>>
  confirm: (id: number, state: Partial<VacancyState>) => void
}

export const useFeedStateStore = create<FeedState>()((set) => ({
  overrides: {},
  confirm: (id, state) =>
    set((current) => ({
      overrides: {
        ...current.overrides,
        [id]: { ...current.overrides[id], ...state },
      },
    })),
}))
