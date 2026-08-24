import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  fetchFeed,
  type FeedMode,
  type FeedResponse,
} from "@/features/feed/api"
import { useFeedStateStore } from "@/features/feed/state/store"
import { SourceIdentity } from "@/features/vacancies/components/source-identity"
import { VacancyUpdatedLabel } from "@/features/vacancies/components/vacancy-updated-label"
import { VacancyStatusIndicators } from "@/features/vacancies/components/vacancy-status-indicators"
import {
  formatPublicationDate,
  presentMatch,
} from "@/features/vacancies/presentation"

type VacancyListProps = {
  mode?: FeedMode
  selectedId: number | null
  onSelect: (id: number) => void
  onLoadingChange?: (loading: boolean) => void
  onVisibleDateChange?: (date: string | null) => void
  jumpDate?: string | null
  onJumpComplete?: () => void
  titleLevel?: 2 | 3
}

export function VacancyList({
  mode = "active",
  selectedId,
  onSelect,
  onLoadingChange,
  onVisibleDateChange,
  jumpDate,
  onJumpComplete,
  titleLevel = 3,
}: VacancyListProps) {
  const VacancyTitle = `h${titleLevel}` as const
  const listRef = useRef<HTMLUListElement>(null)
  const sentinelRef = useRef<HTMLLIElement>(null)
  const [cursor, setCursor] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const overrides = useFeedStateStore((store) => store.overrides)
  const requestKey = `${cursor ?? "initial"}:${attempt}`
  const [state, setState] = useState<{
    key: string
    items: FeedResponse["items"]
    nextCursor: string | null
    failed: boolean
  }>({ key: "", items: [], nextCursor: null, failed: false })

  useEffect(() => {
    const controller = new AbortController()
    onLoadingChange?.(true)
    fetchFeed(mode, cursor, controller.signal).then(
      (feed) => {
        setState((current) => ({
          key: requestKey,
          items: cursor ? [...current.items, ...feed.items] : feed.items,
          nextCursor: feed.next_cursor,
          failed: false,
        }))
        onLoadingChange?.(false)
      },
      () => {
        if (!controller.signal.aborted) {
          setState((current) => ({ ...current, key: requestKey, failed: true }))
          onLoadingChange?.(false)
        }
      },
    )
    return () => controller.abort()
  }, [cursor, mode, onLoadingChange, requestKey])

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

  useEffect(() => {
    const list = listRef.current
    if (!list || !onVisibleDateChange) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (left, right) =>
              left.boundingClientRect.top - right.boundingClientRect.top,
          )
          .at(0)
        if (!visible) return
        onVisibleDateChange(
          visible.target.getAttribute("data-feed-date") || null,
        )
      },
      { root: list, rootMargin: "0px 0px -80% 0px" },
    )
    list
      .querySelectorAll<HTMLElement>("[data-feed-date]")
      .forEach((group) => observer.observe(group))
    return () => observer.disconnect()
  }, [onVisibleDateChange, state.items.length])

  useEffect(() => {
    const list = listRef.current
    if (!list || !jumpDate || state.key !== requestKey) return
    const groups = Array.from(
      list.querySelectorAll<HTMLElement>("[data-feed-date]"),
    ).filter((group) => group.dataset.feedDate)
    const target = groups.find((group) => group.dataset.feedDate! <= jumpDate)
    if (target) {
      target.scrollIntoView({ block: "start" })
      onJumpComplete?.()
    } else if (state.nextCursor && !state.failed) {
      const frame = requestAnimationFrame(() => setCursor(state.nextCursor))
      return () => cancelAnimationFrame(frame)
    } else {
      groups.at(-1)?.scrollIntoView({ block: "start" })
      onJumpComplete?.()
    }
  }, [
    jumpDate,
    onJumpComplete,
    requestKey,
    state.failed,
    state.key,
    state.nextCursor,
  ])

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

  const visibleItems = state.items.filter((vacancy) => {
    const override = overrides[vacancy.id]
    const saved = override?.saved ?? vacancy.saved
    const hidden = override?.hidden ?? vacancy.hidden
    if (mode === "active") return !hidden
    if (mode === "saved") return saved
    return hidden
  })

  if (visibleItems.length === 0 && !state.nextCursor) {
    return (
      <div
        data-testid="feed-scroll-region"
        className="grid min-h-0 flex-1 place-items-center p-4 text-center text-sm text-muted-foreground"
      >
        {mode === "saved"
          ? "Немає збережених вакансій"
          : mode === "hidden"
            ? "Немає прихованих вакансій"
            : "Вакансій поки немає"}
      </div>
    )
  }

  const groups = visibleItems.reduce<
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
      <ul ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
        {groups.map((group) => (
          <li key={group.date ?? "unknown"}>
            <section
              role="group"
              aria-label={formatPublicationDate(group.date)}
              data-feed-date={group.date ?? ""}
            >
              <ul>
                {group.vacancies.map((vacancy) => {
                  const selected = vacancy.id === selectedId
                  const override = overrides[vacancy.id]
                  const seen = override?.seen ?? vacancy.seen
                  const saved = override?.saved ?? vacancy.saved
                  const hidden = override?.hidden ?? vacancy.hidden
                  const match = presentMatch(vacancy.match)
                  const content = (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <VacancyTitle
                          className={`line-clamp-2 text-sm leading-snug ${selected || !seen ? "font-medium" : "font-normal text-muted-foreground"}`}
                        >
                          {vacancy.title}
                          {vacancy.is_deftech && (
                            <span className="ms-1 text-xs font-medium text-primary">
                              DefTech
                            </span>
                          )}
                        </VacancyTitle>
                        <VacancyStatusIndicators
                          hasNote={vacancy.has_note}
                          applicationSubmittedAt={
                            vacancy.application_submitted_at
                          }
                          saved={saved}
                          hidden={hidden}
                        />
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {vacancy.company ?? "Компанію не вказано"} ·{" "}
                        {vacancy.location ?? "Місце не вказано"}
                      </p>
                      <p className="flex items-center justify-between gap-3 text-xs">
                        <span className="min-w-0">
                          {match.precise && (
                            <span
                              data-match-tone={match.tone}
                              className={`truncate ${match.tone === "high" ? "font-medium text-primary" : "text-muted-foreground"}`}
                            >
                              {match.label}
                            </span>
                          )}
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                          <SourceIdentity source={vacancy.source} />
                          <span aria-hidden="true">·</span>
                          <span>
                            {formatPublicationDate(vacancy.posted_date)}
                          </span>
                          <VacancyUpdatedLabel
                            updatedAt={vacancy.source_updated_at}
                          />
                        </span>
                      </p>
                    </>
                  )
                  const className =
                    "flex w-full flex-col gap-1.5 border-b px-4 py-3 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"

                  return (
                    <li key={vacancy.id}>
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onSelect(vacancy.id)}
                        className={`${className} ${selected ? "bg-accent/10 ring-1 ring-inset ring-border" : ""}`}
                      >
                        {content}
                      </button>
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
