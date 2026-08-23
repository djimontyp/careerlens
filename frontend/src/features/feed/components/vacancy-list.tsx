import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  FEED_PAGE_SIZE,
  fetchFeed,
  type FeedResponse,
} from "@/features/feed/api"

export function VacancyList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, Number(searchParams.get("page")) || 1)
  const [attempt, setAttempt] = useState(0)
  const requestKey = `${page}:${attempt}`
  const [state, setState] = useState<{
    key: string
    feed: FeedResponse | null
    failed: boolean
  }>({ key: "", feed: null, failed: false })

  useEffect(() => {
    const controller = new AbortController()
    fetchFeed(page, controller.signal).then(
      (feed) => setState({ key: requestKey, feed, failed: false }),
      () => {
        if (!controller.signal.aborted) {
          setState({ key: requestKey, feed: null, failed: true })
        }
      },
    )
    return () => controller.abort()
  }, [page, requestKey])

  if (state.key === requestKey && state.failed) {
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

  if (state.key !== requestKey || !state.feed) {
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

  if (state.feed.items.length === 0) {
    return (
      <div
        data-testid="feed-scroll-region"
        className="grid min-h-0 flex-1 place-items-center p-4 text-center text-sm text-muted-foreground"
      >
        Вакансій поки немає
      </div>
    )
  }

  const pages = Math.ceil(state.feed.count / FEED_PAGE_SIZE)
  return (
    <div
      data-testid="feed-scroll-region"
      className="flex min-h-0 flex-1 flex-col"
    >
      <ul className="min-h-0 flex-1 divide-y overflow-y-auto">
        {state.feed.items.map((vacancy) => (
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
      </ul>
      {pages > 1 && (
        <nav
          aria-label="Сторінки вакансій"
          className="flex shrink-0 items-center justify-between border-t p-2"
        >
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() =>
              setSearchParams((current) => {
                const next = new URLSearchParams(current)
                if (page === 2) next.delete("page")
                else next.set("page", String(page - 1))
                return next
              })
            }
          >
            Назад
          </Button>
          <span className="text-xs text-muted-foreground">
            {page} з {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pages}
            onClick={() =>
              setSearchParams((current) => {
                const next = new URLSearchParams(current)
                next.set("page", String(page + 1))
                return next
              })
            }
          >
            Далі
          </Button>
        </nav>
      )}
    </div>
  )
}
