import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  fetchFeedDetail,
  type VacancyDetail as VacancyDetailData,
} from "@/features/feed/api"
import { SourceIdentity } from "@/features/vacancies/components/source-identity"

export function VacancyDetail({ id }: { id: number | null }) {
  const [vacancy, setVacancy] = useState<VacancyDetailData | null>(null)
  const [failedId, setFailedId] = useState<number | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (id === null) {
      return
    }
    const controller = new AbortController()
    fetchFeedDetail(id, controller.signal)
      .then(setVacancy)
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setFailedId(id)
        }
      })
    return () => controller.abort()
  }, [id, version])

  if (id === null) {
    return (
      <p className="m-auto text-sm text-muted-foreground">
        Виберіть вакансію зі списку
      </p>
    )
  }
  if (failedId === id) {
    return (
      <div className="m-auto flex flex-col items-center gap-3 text-sm text-muted-foreground">
        Не вдалося завантажити вакансію.
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setFailedId(null)
            setVacancy(null)
            setVersion((value) => value + 1)
          }}
        >
          Повторити
        </Button>
      </div>
    )
  }
  if (vacancy?.id !== id)
    return <p className="m-auto text-sm text-muted-foreground">Завантаження…</p>

  const match = vacancy.match
  const keySignals =
    match?.evidence.items
      .filter((item) => item.type !== "unknown")
      .slice(0, 3) ?? []

  return (
    <article className="@container min-h-full overflow-y-auto">
      <header className="sticky top-0 z-10 border-b bg-background px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold leading-tight">
            {vacancy.title}
          </h3>
          {vacancy.url && (
            <a
              href={vacancy.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-7 shrink-0 items-center rounded-lg border px-2.5 text-xs font-medium hover:bg-state-hover focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              aria-label={`Відкрити на ${vacancy.source.name}`}
            >
              <SourceIdentity source={vacancy.source} />
            </a>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {[vacancy.company, vacancy.location, vacancy.source.name]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </header>
      <div className="grid min-w-0 gap-6 p-4 @min-[760px]:grid-cols-[minmax(0,1fr)_18rem] @min-[760px]:items-start">
        <div className="min-w-0 whitespace-pre-wrap text-sm leading-6">
          {vacancy.description}
        </div>
        {match && (
          <Card
            size="sm"
            role="region"
            aria-label="AI-аналіз відповідності"
            className="@min-[760px]:col-start-2 @min-[760px]:row-start-1"
          >
            <div className="grid grid-cols-[1fr_auto] items-center px-3">
              <span className="text-xs font-medium text-muted-foreground">
                Аналіз відповідності
              </span>
              <Badge variant="secondary">{match.score}%</Badge>
            </div>
            <div className="flex flex-col gap-3 px-3">
              {match.reason && (
                <p className="text-sm leading-5">{match.reason}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Покриття доказами{" "}
                {Math.round(match.evidence.evidence_coverage * 100)}%
              </p>
              {keySignals.length > 0 && (
                <ul className="flex flex-col gap-1.5 text-xs">
                  {keySignals.map((item) => (
                    <li
                      key={`${item.type}-${item.label}`}
                      className="flex gap-2"
                    >
                      <span
                        aria-hidden="true"
                        className="text-muted-foreground"
                      >
                        {item.type === "strong"
                          ? "✓"
                          : item.type === "gaps"
                            ? "○"
                            : "–"}
                      </span>
                      <span>
                        <span className="font-medium">{item.label}</span>
                        {item.explanation && (
                          <span className="text-muted-foreground">
                            {" "}
                            · {item.explanation}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {match.evidence.items.length > 0 && (
                <details>
                  <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                    Показати деталі
                  </summary>
                  <div className="flex flex-col gap-3 pt-3">
                    {(
                      [
                        ["strong", "Сильні збіги"],
                        ["partial", "Часткові збіги"],
                        ["gaps", "Прогалини"],
                        ["unknown", "Невідомо"],
                      ] as const
                    ).map(([type, label]) => {
                      const items = match.evidence.items.filter(
                        (item) => item.type === type,
                      )
                      if (items.length === 0) return null
                      return (
                        <section key={type} className="flex flex-col gap-1">
                          <h4 className="text-xs font-medium text-muted-foreground">
                            {label} ({items.length})
                          </h4>
                          <ul className="flex flex-col gap-1 text-xs">
                            {items.map((item) => (
                              <li key={`${item.label}-${item.explanation}`}>
                                <span className="font-medium">
                                  {item.label}
                                </span>
                                {item.explanation && (
                                  <span className="text-muted-foreground">
                                    {" "}
                                    · {item.explanation}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </section>
                      )
                    })}
                  </div>
                </details>
              )}
            </div>
          </Card>
        )}
      </div>
    </article>
  )
}
