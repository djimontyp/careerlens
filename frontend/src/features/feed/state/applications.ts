import { create } from "zustand"

import {
  deleteVacancyApplication,
  updateVacancyApplication,
  type VacancyApplication,
} from "@/features/feed/api"
import { ApiError } from "@/lib/api"

type ApplicationMutation = {
  draft: VacancyApplication | null
  pending: boolean
  error: string | null
}

type ApplicationsState = {
  mutations: Record<number, ApplicationMutation>
  generation: number
  changeDraft: (id: number, draft: VacancyApplication) => void
  discard: (id: number) => void
  submit: (
    id: number,
    draft: VacancyApplication | null,
    onChange: (application: VacancyApplication | null) => void,
  ) => Promise<boolean>
  reset: () => void
}

// Submitted drafts and pending operations survive an editor remount. Only an
// explicit save/delete writes to the API; never replay a mutation on remount.
export const useVacancyApplicationsStore = create<ApplicationsState>()(
  (set, get) => ({
    mutations: {},
    generation: 0,
    changeDraft: (id, draft) => {
      const mutation = get().mutations[id]
      if (!mutation || mutation.pending) return
      set((state) => ({
        mutations: { ...state.mutations, [id]: { ...mutation, draft } },
      }))
    },
    discard: (id) => {
      if (get().mutations[id]?.pending) return
      set((state) => {
        const mutations = { ...state.mutations }
        delete mutations[id]
        return { mutations }
      })
    },
    submit: async (id, draft, onChange) => {
      if (get().mutations[id]?.pending) return false
      const generation = get().generation
      set((state) => ({
        mutations: {
          ...state.mutations,
          [id]: { draft, pending: true, error: null },
        },
      }))
      let saved: VacancyApplication | null
      try {
        if (draft) saved = await updateVacancyApplication(id, draft)
        else {
          await deleteVacancyApplication(id)
          saved = null
        }
      } catch (error) {
        if (get().generation !== generation) return false
        const message =
          error instanceof ApiError && error.status === 422
            ? "Дата подачі має бути не раніше 01.01.2000 і не пізніше сьогодні"
            : draft
              ? "Не вдалося зберегти подачу"
              : "Не вдалося видалити подачу"
        set((state) => ({
          mutations: {
            ...state.mutations,
            [id]: { draft, pending: false, error: message },
          },
        }))
        return false
      }
      if (get().generation !== generation) return false
      onChange(saved)
      set((state) => {
        const mutations = { ...state.mutations }
        delete mutations[id]
        return { mutations }
      })
      return true
    },
    reset: () =>
      set((state) => ({ mutations: {}, generation: state.generation + 1 })),
  }),
)
