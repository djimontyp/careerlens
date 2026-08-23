import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { fetchFeed, type FeedResponse } from "@/features/feed/api"

export function VacancyList() {
  const sentinelRef = useRef<HTMLLIElement>(null)
  const [cursor, setCursor] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const requestKey = `${cursor ?? "initial"}:${attempt}`
  const [state, setState] = useState<{
    key: string
    items: FeedResponse["items"]
    nextCursor: string | null
    failed: boolean
  }>({ key: "", items: [], nextCursor: null, failed: false })

  useEffect(() => {
    const controller = new AbortController()
    fetchFeed(cursor, controller.signal).then(
      (feed) =>
        setState((current) => ({
          key: requestKey,
          items: cursor ? [...current.items, ...feed.items] : feed.items,
          nextCursor: feed.next_cursor,
          failed: false,
        })),
      () => {
        if (!controller.signal.aborted) {
          setState((current) => ({ ...current, key: requestKey, failed: true }))
        }
      },
    )
    return () => controller.abort()
  }, [cursor, requestKey])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (
      !sentinel ||
      state.key !== requestKey ||
      state.failed ||
      !state.nextCursor
    )
      return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setCursor(state.nextCursor)
      },
      { root: sentinel.closest("ul"), rootMargin: "240px" },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [requestKey, state.failed, state.key, state.nextCursor])

  if (state.key === requestKey && state.failed && state.items.length === 0) {
    return (
      <div
        data-testid="feed-scroll-region"
        className="grid min-h-0 flex-1 place-items-center p-4 text-center text-sm"
      >
        <div className="space-y-3">
          <p role="alert">Не вдалося завантажити вакансії.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Повторити
          </Button>
        </div>
      </div>
    )
  }

  if (state.key !== requestKey && state.items.length === 0) {
    return (
      <div
        data-testid="feed-scroll-region"
        aria-live="polite"
        className="grid min-h-0 flex-1 place-items-center p-4 text-sm text-muted-foreground"
      >
        Завантаження вакансій…
      </div>
    )
  }

  if (state.items.length === 0) {
    return (
      <div
        data-testid="feed-scroll-region"
        className="grid min-h-0 flex-1 place-items-center p-4 text-center text-sm text-muted-foreground"
      >
        Вакансій поки немає
      </div>
    )
  }

  return (
    <div
      data-testid="feed-scroll-region"
      className="flex min-h-0 flex-1 flex-col"
    >
      <ul className="min-h-0 flex-1 divide-y overflow-y-auto">
        {state.items.map((vacancy) => (
          <li key={vacancy.id} className="px-3 py-3 hover:bg-state-hover">
            <article className="space-y-1.5">
              <h3 className="text-sm font-semibold leading-snug">
                {vacancy.url ? (
                  <a href={vacancy.url}>{vacancy.title}</a>
                ) : (
                  vacancy.title
                )}
              </h3>
              <p className="text-sm text-muted-foreground">
                {vacancy.company ?? "Компанію не вказано"}
              </p>
              <p className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                <span>{vacancy.location ?? "Місце не вказано"}</span>
                <span>{vacancy.posted_date ?? "Дата невідома"}</span>
                <span>{vacancy.source.name}</span>
              </p>
            </article>
          </li>
        ))}
        <li
          ref={sentinelRef}
          className="flex min-h-14 items-center justify-center p-2 text-center text-xs text-muted-foreground"
        >
          {state.failed ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Повторити завантаження
            </Button>
          ) : state.key !== requestKey ? (
            "Завантажуємо старіші вакансії…"
          ) : state.nextCursor ? null : (
            "Ви переглянули всю стрічку"
          )}
        </li>
      </ul>
    </div>
  )
}
