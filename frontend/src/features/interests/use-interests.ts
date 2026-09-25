import { useCallback, useEffect, useState } from "react"

import { fetchInterests, type Interest } from "@/features/interests/api"

type InterestsState =
  | { status: "loading"; interests: Interest[]; limit: number }
  | { status: "failed"; interests: Interest[]; limit: number }
  | { status: "ready"; interests: Interest[]; limit: number }

export function useInterests() {
  const [state, setState] = useState<InterestsState>({
    status: "loading",
    interests: [],
    limit: 0,
  })

  const load = useCallback((signal?: AbortSignal) => {
    return fetchInterests(signal).then(
      (response) => {
        if (signal?.aborted) return
        setState({
          status: "ready",
          interests: response.items,
          limit: response.limit,
        })
      },
      () => {
        if (!signal?.aborted) {
          setState((current) => ({ ...current, status: "failed" }))
        }
      },
    )
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  return {
    ...state,
    // Returns a promise that resolves once the refreshed state has been
    // applied, so a caller that returns focus to an element whose enabled
    // state depends on the fresh count (the create button at the limit, for
    // example) can wait for it instead of closing over stale data.
    reload: () => {
      // Keep the current list mounted while a reload is in flight (a CRUD
      // action calls this to pick up the fresh state): dropping to "loading"
      // would unmount every card and detach any element focus was returned
      // to. A retry from "failed" has no cards to protect, so it switches to
      // "loading" to give the busy state some visible feedback instead.
      setState((current) =>
        current.status === "failed"
          ? { ...current, status: "loading" }
          : current,
      )
      return load()
    },
  }
}
