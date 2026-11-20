import { useCallback, useEffect, useRef, useState } from "react"

import { fetchInterests, type Interest } from "@/features/interests/api"

type InterestsState =
  | { status: "loading"; interests: Interest[]; limit: number }
  | { status: "failed"; interests: Interest[]; limit: number }
  | { status: "ready"; interests: Interest[]; limit: number }

export function useInterests() {
  const latestRequest = useRef(0)
  const [state, setState] = useState<InterestsState>({
    status: "loading",
    interests: [],
    limit: 0,
  })

  const load = useCallback((signal?: AbortSignal) => {
    // Mutations on different cards can finish their reloads out of order.
    const requestId = ++latestRequest.current
    return fetchInterests(signal).then(
      (response): Interest[] | undefined => {
        if (signal?.aborted || requestId !== latestRequest.current)
          return undefined
        setState({
          status: "ready",
          interests: response.items,
          limit: response.limit,
        })
        return response.items
      },
      () => {
        if (!signal?.aborted && requestId === latestRequest.current) {
          setState((current) => ({ ...current, status: "failed" }))
        }
        return undefined
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
    // Returns a promise that resolves with the applied interests once the
    // refreshed state is in place (undefined when the request failed or a
    // newer one superseded it), so a caller that returns focus to an element whose enabled
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
