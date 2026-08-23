import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchFeed, type FeedResponse } from "@/features/feed/api"
import { SourceIdentity } from "@/features/vacancies/components/source-identity"
import { formatPublicationDate } from "@/features/vacancies/presentation"

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
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <ul aria-busy="true" aria-label="Завантаження вакансій">
          {Array.from({ length: 8 }, (_, index) => (
            <li key={index} className="space-y-2 border-b px-4 py-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="ms-auto h-3 w-1/3" />
            </li>
          ))}
        </ul>
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

  const groups = state.items.reduce<
    Array<{ date: string | null; vacancies: FeedResponse["items"] }>
  >((result, vacancy) => {
    const group = result.at(-1)
    if (group?.date === vacancy.posted_date) group.vacancies.push(vacancy)
    else result.push({ date: vacancy.posted_date, vacancies: [vacancy] })
    return result
  }, [])

  return (
    <div
      data-testid="feed-scroll-region"
      className="flex min-h-0 flex-1 flex-col"
    >
      <ul className="min-h-0 flex-1 overflow-y-auto">
        {groups.map((group) => (
          <li key={group.date ?? "unknown"}>
            <section
              role="group"
              aria-label={formatPublicationDate(group.date)}
              data-feed-date={group.date ?? undefined}
            >
              <ul>
                {group.vacancies.map((vacancy) => {
                  const content = (
                    <>
                      <h3 className="line-clamp-2 text-sm leading-snug font-medium">
                        {vacancy.title}
                      </h3>
                      <p className="truncate text-sm text-muted-foreground">
                        {vacancy.company ?? "Компанію не вказано"} ·{" "}
                        {vacancy.location ?? "Місце не вказано"}
                      </p>
                      <p className="flex items-center justify-end gap-1.5 text-right text-xs text-muted-foreground">
                        <SourceIdentity source={vacancy.source} />
                        <span aria-hidden="true">·</span>
                        <span>
                          {formatPublicationDate(vacancy.posted_date)}
                        </span>
                      </p>
                    </>
                  )
                  const className =
                    "flex w-full flex-col gap-1.5 border-b px-4 py-3 text-left transition-colors hover:bg-accent"

                  return (
                    <li key={vacancy.id}>
                      {vacancy.url ? (
                        <a
                          href={vacancy.url}
                          className={`${className} focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none`}
                        >
                          {content}
                        </a>
                      ) : (
                        <article
                          aria-label={vacancy.title}
                          className={className}
                        >
                          {content}
                        </article>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
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
