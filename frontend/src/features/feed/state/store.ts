import { create } from "zustand"

import type { VacancyDetail } from "@/features/feed/api"

type VacancyState = Pick<
  VacancyDetail,
  | "saved"
  | "hidden"
  | "seen"
  | "note"
  | "has_note"
  | "application"
  | "application_submitted_at"
>

type FeedState = {
  overrides: Record<number, Partial<VacancyState>>
  confirm: (id: number, state: Partial<VacancyState>) => void
  revalidate: (
    id: number,
    expected: Partial<VacancyState> | undefined,
    state: Partial<VacancyState>,
  ) => void
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
  revalidate: (id, expected, state) =>
    set((current) => {
      const fresh = Object.fromEntries(
        Object.entries(state).filter(
          ([key]) =>
            current.overrides[id]?.[key as keyof VacancyState] ===
            expected?.[key as keyof VacancyState],
        ),
      )
      return {
        overrides: {
          ...current.overrides,
          [id]: { ...current.overrides[id], ...fresh },
        },
      }
    }),
}))
