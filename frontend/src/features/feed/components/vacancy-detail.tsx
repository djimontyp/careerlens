import {
  Calendar03Icon,
  Location01Icon,
  OfficeIcon,
  Shield01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { type ReactNode, useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { WorkspaceHeader } from "@/components/workspace-header"
import {
  fetchFeedDetail,
  type VacancyApplication,
  type VacancyDetail as VacancyDetailData,
  updateVacancyState,
} from "@/features/feed/api"
import { ApplicationBadge } from "@/features/feed/components/application-badge"
import { VacancyDescription } from "@/features/feed/components/vacancy-description"
import { VacancyMatch } from "@/features/feed/components/vacancy-match"
import { VacancyToolbar } from "@/features/feed/components/vacancy-toolbar"
import { useFeedStateStore } from "@/features/feed/state/store"
import { useVacancyNotesStore } from "@/features/feed/state/notes"
import { formatFullPublicationDate } from "@/features/vacancies/presentation"

export function VacancyDetail({
  id,
  onStateChange,
  withPanelHeader = false,
  panelAction,
}: {
  id: number | null
  onStateChange?: (
    state: Partial<Pick<VacancyDetailData, "saved" | "hidden">>,
  ) => void
  withPanelHeader?: boolean
  panelAction?: ReactNode
}) {
  const [loadedVacancy, setVacancy] = useState<VacancyDetailData | null>(null)
  const [failedId, setFailedId] = useState<number | null>(null)
  const [version, setVersion] = useState(0)
  const override = useFeedStateStore((state) =>
    id === null ? undefined : state.overrides[id],
  )
  const confirm = useFeedStateStore((state) => state.confirm)
  const vacancy = useMemo(
    () =>
      loadedVacancy && {
        ...loadedVacancy,
        ...(loadedVacancy.id === id ? override : undefined),
      },
    [loadedVacancy, id, override],
  )

  useEffect(() => {
    if (id === null) return
    const controller = new AbortController()
    const previousOverride = useFeedStateStore.getState().overrides[id]
    const previousDraft = useVacancyNotesStore.getState().drafts[id]
    fetchFeedDetail(id, controller.signal)
      .then((loaded) => {
        if (controller.signal.aborted) return
        useFeedStateStore.getState().revalidate(id, previousOverride, {
          note: loaded.note,
          has_note: loaded.has_note,
          application: loaded.application,
          application_submitted_at: loaded.application_submitted_at,
        })
        useVacancyNotesStore.getState().acceptServerNote(id, previousDraft)
        setVacancy(loaded)
        setFailedId(null)
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError"))
          setFailedId(id)
      })
    return () => controller.abort()
  }, [id, version])

  useEffect(() => {
    if (vacancy?.id !== id || vacancy.seen || override?.seen) return
    updateVacancyState(id, { seen: true }).then(
      (state) => confirm(id, state),
      () => undefined,
    )
  }, [confirm, id, override, vacancy])

  const updateApplication = (application: VacancyApplication | null) => {
    const vacancyId = id
    if (vacancyId !== null)
      confirm(vacancyId, {
        application,
        application_submitted_at: application?.submitted_at ?? null,
      })
    setVacancy((current) =>
      current?.id === vacancyId
        ? {
            ...current,
            application,
            application_submitted_at: application?.submitted_at ?? null,
          }
        : current,
    )
  }
  const resolvedVacancy = vacancy?.id === id ? vacancy : null
  const panelHeader = withPanelHeader && (
    <WorkspaceHeader className="z-10 flex h-12 shrink-0 items-center border-b px-3">
      <h2 className="min-w-0 truncate text-sm font-semibold">
        Деталі вакансії
      </h2>
      <div className="ms-auto flex min-w-0 items-center gap-1">
        {resolvedVacancy && (
          <VacancyToolbar
            vacancy={resolvedVacancy}
            variant="quick"
            onStateChange={onStateChange}
            onApplicationChange={updateApplication}
          />
        )}
        {panelAction}
      </div>
    </WorkspaceHeader>
  )

  if (id === null)
    return (
      <>
        {panelHeader}
        <p className="m-auto text-sm text-muted-foreground">
          Виберіть вакансію зі списку
        </p>
      </>
    )
  if (failedId === id)
    return (
      <>
        {panelHeader}
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
      </>
    )
  if (vacancy?.id !== id)
    return (
      <>
        {panelHeader}
        <p className="m-auto text-sm text-muted-foreground">Завантаження…</p>
      </>
    )

  const location = vacancy.location || "Локацію не вказано"
  const publicationDate = vacancy.posted_date
    ? formatFullPublicationDate(vacancy.posted_date)
    : "Дата невідома"
  return (
    <>
      {panelHeader}
      <article className="@container min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl">
          <WorkspaceHeader className="border-b px-4 py-3 @min-[560px]:px-6">
            <div className="flex flex-col items-stretch gap-3 @min-[560px]:flex-row @min-[560px]:items-center @min-[560px]:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-2 @min-[560px]:flex-nowrap">
                {vacancy.is_deftech && (
                  <HugeiconsIcon
                    icon={Shield01Icon}
                    className="size-5 shrink-0 text-primary"
                    aria-label="DefTech вакансія"
                  />
                )}
                <h2
                  className="min-w-0 text-xl font-semibold leading-tight @min-[560px]:truncate"
                  title={vacancy.title}
                >
                  {vacancy.title}
                </h2>
                {vacancy.application && (
                  <ApplicationBadge application={vacancy.application} />
                )}
              </div>
              {!withPanelHeader && (
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                  <VacancyToolbar
                    vacancy={vacancy}
                    variant="quick"
                    onStateChange={onStateChange}
                    onApplicationChange={updateApplication}
                  />
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-col items-stretch gap-2 @min-[560px]:flex-row @min-[560px]:items-center @min-[560px]:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                {vacancy.company && (
                  <span
                    aria-label="Компанія"
                    className="flex min-w-0 items-center gap-1"
                  >
                    <HugeiconsIcon
                      icon={OfficeIcon}
                      className="size-4 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="truncate">{vacancy.company}</span>
                  </span>
                )}
                {vacancy.company && (
                  <Separator
                    orientation="vertical"
                    className="hidden h-4 @min-[560px]:block"
                  />
                )}
                <span
                  aria-label="Локація"
                  className="flex min-w-0 items-center gap-1"
                >
                  <HugeiconsIcon
                    icon={Location01Icon}
                    className="size-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="truncate">{location}</span>
                </span>
                <Separator
                  orientation="vertical"
                  className="hidden h-4 @min-[560px]:block"
                />
                <span
                  aria-label="Дата публікації"
                  className="flex shrink-0 items-center gap-1"
                >
                  <HugeiconsIcon
                    icon={Calendar03Icon}
                    className="size-4 shrink-0"
                    aria-hidden="true"
                  />
                  {publicationDate}
                </span>
                {vacancy.source_updated_at && (
                  <span className="shrink-0">Оновлено</span>
                )}
              </div>
              <VacancyToolbar
                vacancy={vacancy}
                variant="context"
                onStateChange={onStateChange}
                onApplicationChange={updateApplication}
              />
            </div>
          </WorkspaceHeader>
        </div>
        <div
          data-testid="detail-scroll-region"
          className="grid min-w-0 gap-6 px-4 pb-4 pt-4 @min-[560px]:px-6 @min-[560px]:pb-6 @min-[760px]:grid-cols-[minmax(0,1fr)_18rem] @min-[760px]:items-start"
        >
          <div className="flex min-w-0 flex-col gap-2 @min-[760px]:col-start-2 @min-[760px]:row-start-1 @min-[760px]:mt-4">
            {vacancy.match && <VacancyMatch vacancy={vacancy} />}
          </div>
          <div className="min-w-0 @min-[760px]:col-start-1 @min-[760px]:row-start-1">
            <VacancyDescription vacancy={vacancy} />
          </div>
        </div>
      </article>
    </>
  )
}
