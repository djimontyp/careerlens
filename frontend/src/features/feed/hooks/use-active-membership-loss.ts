import { useEffect, useRef } from "react"

import type { FeedMode, FeedResponse } from "@/features/feed/api"
import { useFeedStateStore } from "@/features/feed/state/store"

type Overrides = ReturnType<typeof useFeedStateStore.getState>["overrides"]
type Item = FeedResponse["items"][number]

function membershipReasons(item: Item, overrides: Overrides) {
  const override = overrides[item.id]
  const applicationSubmittedAt =
    override?.application_submitted_at !== undefined
      ? override.application_submitted_at
      : item.application_submitted_at
  return {
    saved: override?.saved ?? item.saved,
    applied: applicationSubmittedAt !== null,
  }
}

/**
 * In active mode the server admits a vacancy when it matches an active
 * interest, is saved or has an application. The client cannot tell whether an
 * unsaved or withdrawn vacancy still matches an interest, so it reports the
 * loss instead of deciding: `onLost` fires when a confirmed user change drops a
 * listed vacancy's saved or applied reason. Changes that arrive together with
 * freshly fetched items are server truth and never report a loss.
 */
export function useActiveMembershipLoss(
  mode: FeedMode,
  items: Item[],
  overrides: Overrides,
  onLost: () => void,
) {
  const previous = useRef({ items, overrides })
  const report = useRef(onLost)
  useEffect(() => {
    report.current = onLost
  })

  useEffect(() => {
    const before = previous.current
    previous.current = { items, overrides }
    if (mode !== "active" || before.items !== items) return
    const lost = items.some((item) => {
      const then = membershipReasons(item, before.overrides)
      const now = membershipReasons(item, overrides)
      return (then.saved && !now.saved) || (then.applied && !now.applied)
    })
    if (lost) report.current()
  }, [items, mode, overrides])
}
