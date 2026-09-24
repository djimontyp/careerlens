import { create } from "zustand"

import { updateVacancyNote } from "@/features/feed/api"
import { useFeedStateStore } from "@/features/feed/state/store"

type NoteDraft = {
  value: string
  revision: number
  status: "pending" | "saved" | "error"
  saving: boolean
  timer: ReturnType<typeof setTimeout> | null
}

type FlushOptions = { keepalive?: boolean }

type NotesState = {
  drafts: Record<number, NoteDraft>
  generation: number
  change: (id: number, value: string) => void
  flush: (id: number, options?: FlushOptions) => Promise<void>
  flushAll: (options?: FlushOptions) => Promise<void>
  acceptServerNote: (id: number, expected: NoteDraft | undefined) => void
  reset: () => void
}

// Tracks the promise of each vacancy's flush chain (the initial write plus
// any re-flush of a newer revision typed while it was in flight), keyed by
// vacancy id. A caller that needs every draft settled, such as logout,
// awaits this instead of racing a write that is already under way.
const inFlightFlushes = new Map<number, Promise<void>>()

// Session memory only: drafts survive editor/navigation unmounts, not a logout
// or page reload. Each vacancy has at most one request in flight.
export const useVacancyNotesStore = create<NotesState>()((set, get) => {
  async function runFlush(id: number, options?: FlushOptions): Promise<void> {
    const draft = get().drafts[id]
    if (!draft || draft.status === "saved") return
    if (draft.timer) clearTimeout(draft.timer)
    const generation = get().generation
    set((state) => ({
      drafts: {
        ...state.drafts,
        [id]: { ...draft, saving: true, timer: null, status: "pending" },
      },
    }))
    let result: { note: string } | undefined
    try {
      result = await updateVacancyNote(
        id,
        draft.value,
        options?.keepalive ? { keepalive: true } : undefined,
      )
    } catch {
      // Keep the draft and expose retry even when there is no mounted editor.
    }
    if (get().generation !== generation) return
    const current = get().drafts[id]
    const hasNewerDraft = current.revision !== draft.revision
    set((state) => ({
      drafts: {
        ...state.drafts,
        [id]: {
          ...current,
          saving: false,
          status: hasNewerDraft ? "pending" : result ? "saved" : "error",
        },
      },
    }))
    if (result) {
      useFeedStateStore
        .getState()
        .confirm(id, { note: result.note, has_note: Boolean(result.note) })
    }
    if (hasNewerDraft) {
      await runFlush(id, options)
    }
  }

  return {
    drafts: {},
    generation: 0,
    acceptServerNote: (id, expected) => {
      if (
        !expected ||
        expected.status !== "saved" ||
        get().drafts[id] !== expected
      )
        return
      if (expected.timer) clearTimeout(expected.timer)
      set((state) => {
        const drafts = { ...state.drafts }
        delete drafts[id]
        return { drafts }
      })
    },
    change: (id, value) => {
      const previous = get().drafts[id]
      if (previous?.timer) clearTimeout(previous.timer)
      const timer = setTimeout(() => void get().flush(id), 800)
      set((state) => ({
        drafts: {
          ...state.drafts,
          [id]: {
            value,
            revision: (previous?.revision ?? 0) + 1,
            status: "pending",
            saving: previous?.saving ?? false,
            timer,
          },
        },
      }))
    },
    flush: (id, options) => {
      const inFlight = inFlightFlushes.get(id)
      if (inFlight) return inFlight
      const draft = get().drafts[id]
      if (!draft || draft.status === "saved") return Promise.resolve()
      const flushing = runFlush(id, options).finally(() => {
        if (inFlightFlushes.get(id) === flushing) inFlightFlushes.delete(id)
      })
      inFlightFlushes.set(id, flushing)
      return flushing
    },
    flushAll: async (options) => {
      await Promise.all(
        Object.keys(get().drafts).map((key) =>
          get().flush(Number(key), options),
        ),
      )
    },
    reset: () => {
      for (const draft of Object.values(get().drafts)) {
        if (draft.timer) clearTimeout(draft.timer)
      }
      set((state) => ({ drafts: {}, generation: state.generation + 1 }))
    },
  }
})

// A note typed inside the 800 ms autosave debounce is otherwise lost on tab
// close, reload or navigation away, because the debounce timer never gets a
// chance to fire. `pagehide` and a hidden `visibilitychange` flush any such
// pending draft immediately with a keepalive request, which the browser
// keeps alive past page teardown. `flush()` already cancels the debounce
// timer and gates on `draft.saving` before it does anything else, so calling
// it from both listeners for the same tab-close sequence cannot double-send:
// whichever fires first marks the draft `saving`, and the other becomes a
// no-op.
function flushPendingNotesOnHide() {
  const { drafts, flush } = useVacancyNotesStore.getState()
  for (const key of Object.keys(drafts)) {
    const id = Number(key)
    const draft = drafts[id]
    if (draft && draft.status === "pending" && !draft.saving) {
      void flush(id, { keepalive: true })
    }
  }
}

function handleVisibilityChange() {
  if (document.visibilityState === "hidden") flushPendingNotesOnHide()
}

function hasUnsavedNotes(drafts: Record<number, NoteDraft>): boolean {
  return Object.values(drafts).some(
    (draft) => draft.status === "pending" || draft.status === "error",
  )
}

function guardBeforeUnload(event: BeforeUnloadEvent) {
  event.preventDefault()
  event.returnValue = ""
}

let unloadGuardActive = false

function syncUnloadGuard(drafts: Record<number, NoteDraft>) {
  const unsaved = hasUnsavedNotes(drafts)
  if (unsaved === unloadGuardActive) return
  unloadGuardActive = unsaved
  if (unsaved) {
    window.addEventListener("beforeunload", guardBeforeUnload)
  } else {
    window.removeEventListener("beforeunload", guardBeforeUnload)
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flushPendingNotesOnHide)
  document.addEventListener("visibilitychange", handleVisibilityChange)
  useVacancyNotesStore.subscribe((state) => syncUnloadGuard(state.drafts))
}

const LOGOUT_FLUSH_TIMEOUT_MS = 1500

// Awaits every pending note write before logout navigates away, bounded so a
// hung request cannot block logout indefinitely.
export function flushPendingNotesBeforeLogout(
  timeoutMs: number = LOGOUT_FLUSH_TIMEOUT_MS,
): Promise<void> {
  const pending = useVacancyNotesStore.getState().flushAll()
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, timeoutMs)
    void pending.finally(() => {
      clearTimeout(timer)
      resolve()
    })
  })
}
