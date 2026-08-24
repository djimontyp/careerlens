import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable"
import {
  ArrowLeft02Icon,
  FilterHorizontalIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Fragment, type ReactNode, useCallback, useState } from "react"
import {
  NavLink,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ResizeHandle } from "@/features/feed/components/resize-handle"
import { FeedDateJump } from "@/features/feed/components/feed-date-jump"
import { FeedRefreshButton } from "@/features/feed/components/feed-refresh-button"
import { SortablePanel } from "@/features/feed/components/sortable-panel"
import { VacancyList } from "@/features/feed/components/vacancy-list"
import { PanelVisibilityControls } from "@/features/feed/components/panel-visibility-controls"
import {
  DEFAULT_PANEL_ORDER,
  PANEL_MIN_WIDTH,
  type FeedPanel,
} from "@/features/feed/layout/geometry"
import { useFeedLayoutStore } from "@/features/feed/layout/store"
import { useIsMobile } from "@/hooks/use-mobile"
import { useMediaQuery } from "@/hooks/use-media-query"

const PANEL_LABELS: Record<FeedPanel, string> = {
  list: "Список вакансій",
  detail: "Деталі вакансії",
  filters: "Фільтри вакансій",
}

export function FeedWorkspace() {
  const isMobile = useIsMobile()
  const canPinFilters = useMediaQuery("(min-width: 1024px)")
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = Number(searchParams.get("vacancy")) || null
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [visibleDate, setVisibleDate] = useState<string | null>()
  const [jumpDate, setJumpDate] = useState<string | null>(null)
  const handleLoadingChange = useCallback(
    (loading: boolean) => setRefreshing(loading),
    [],
  )
  const order = useFeedLayoutStore((state) => state.order)
  const visibility = useFeedLayoutStore((state) => state.visibility)
  const widths = useFeedLayoutStore((state) => state.widths)
  const movePanel = useFeedLayoutStore((state) => state.movePanel)
  const resizeBoundary = useFeedLayoutStore((state) => state.resizeBoundary)
  const togglePanel = useFeedLayoutStore((state) => state.togglePanel)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function handleSelect(id: number) {
    const next = new URLSearchParams(searchParams)
    if (id === selectedId) {
      next.delete("vacancy")
      if (!isMobile && visibility.detail) togglePanel("detail")
      setSearchParams(next)
      return
    }
    next.set("vacancy", String(id))
    if (isMobile) navigate(`/feed/detail?${next}`)
    else {
      if (!visibility.detail) togglePanel("detail")
      setSearchParams(next)
    }
  }

  if (isMobile) {
    return pathname === "/feed/detail" ? (
      <MobileDetail />
    ) : (
      <MobileList selectedId={selectedId} onSelect={handleSelect} />
    )
  }

  const visibleOrder = order.filter(
    (panel) => visibility[panel] && (panel !== "filters" || canPinFilters),
  )
  function handleDragEnd({ active, over }: DragEndEvent) {
    if (
      over &&
      active.id !== over.id &&
      DEFAULT_PANEL_ORDER.includes(active.id as FeedPanel) &&
      DEFAULT_PANEL_ORDER.includes(over.id as FeedPanel)
    ) {
      movePanel(active.id as FeedPanel, over.id as FeedPanel)
    }
  }

  return (
    <div className="flex h-full min-h-0">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={visibleOrder}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {visibleOrder.map((panel, index) => {
              const next = visibleOrder[index + 1]
              return (
                <Fragment key={panel}>
                  <SortablePanel
                    id={panel}
                    disabled={visibleOrder.length < 2}
                    style={{
                      width: panel === "detail" ? undefined : widths[panel],
                      flex: panel === "detail" ? "1 1 0" : undefined,
                      minWidth: PANEL_MIN_WIDTH[panel],
                    }}
                  >
                    {(handle) => (
                      <EmptyPanel
                        panel={panel}
                        action={handle}
                        selectedId={selectedId}
                        onSelect={handleSelect}
                        refreshVersion={refreshVersion}
                        refreshing={refreshing}
                        onRefresh={() =>
                          setRefreshVersion((value) => value + 1)
                        }
                        onLoadingChange={handleLoadingChange}
                        visibleDate={visibleDate}
                        onVisibleDateChange={setVisibleDate}
                        jumpDate={jumpDate}
                        onJump={setJumpDate}
                      />
                    )}
                  </SortablePanel>
                  {next && (
                    <ResizeHandle
                      label={`Змінити межу ${PANEL_LABELS[panel]} — ${PANEL_LABELS[next]}`}
                      value={widths[panel]}
                      min={PANEL_MIN_WIDTH[panel]}
                      max={widths[panel] + widths[next] - PANEL_MIN_WIDTH[next]}
                      onChange={(value) => resizeBoundary(panel, next, value)}
                    />
                  )}
                </Fragment>
              )
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}

export function FeedDesktopActions() {
  const visibility = useFeedLayoutStore((state) => state.visibility)
  const togglePanel = useFeedLayoutStore((state) => state.togglePanel)

  return (
    <>
      <PanelVisibilityControls
        listVisible={visibility.list}
        detailVisible={visibility.detail}
        filtersVisible={visibility.filters}
        onToggleList={() => togglePanel("list")}
        onToggleDetail={() => togglePanel("detail")}
        onToggleFilters={() => togglePanel("filters")}
      />
      <FilterSheet />
    </>
  )
}

export function FeedMobileActions() {
  return <FilterSheet iconOnly />
}

function EmptyPanel({
  panel,
  action,
  selectedId,
  onSelect,
  refreshVersion,
  refreshing,
  onRefresh,
  onLoadingChange,
  visibleDate,
  onVisibleDateChange,
  jumpDate,
  onJump,
}: {
  panel: FeedPanel
  action?: ReactNode
  selectedId: number | null
  onSelect: (id: number) => void
  refreshVersion: number
  refreshing: boolean
  onRefresh: () => void
  onLoadingChange: (loading: boolean) => void
  visibleDate: string | null | undefined
  onVisibleDateChange: (date: string | null) => void
  jumpDate: string | null
  onJump: (date: string | null) => void
}) {
  return (
    <section
      aria-label={PANEL_LABELS[panel]}
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border bg-background"
    >
      <header className="flex h-12 shrink-0 items-center border-b px-3">
        <h2 className="text-sm font-semibold">{PANEL_LABELS[panel]}</h2>
        {panel === "list" && (
          <div className="ms-auto flex items-center gap-1">
            <FeedDateJump visibleDate={visibleDate} onJump={onJump} />
            <FeedRefreshButton refreshing={refreshing} onRefresh={onRefresh} />
            {action}
          </div>
        )}
        {panel !== "list" && action && <div className="ms-auto">{action}</div>}
      </header>
      {panel === "list" ? (
        <VacancyList
          key={refreshVersion}
          selectedId={selectedId}
          onSelect={onSelect}
          onLoadingChange={onLoadingChange}
          onVisibleDateChange={onVisibleDateChange}
          jumpDate={jumpDate}
          onJumpComplete={() => onJump(null)}
        />
      ) : (
        <div
          data-testid="feed-scroll-region"
          className="grid min-h-0 flex-1 place-items-center overflow-y-auto p-4 text-center text-sm text-muted-foreground"
        >
          Поки порожньо
        </div>
      )}
    </section>
  )
}

function MobileList({
  selectedId,
  onSelect,
}: {
  selectedId: number | null
  onSelect: (id: number) => void
}) {
  return (
    <section
      aria-label="Список вакансій"
      className="flex h-full min-h-0 flex-col bg-background"
    >
      <VacancyList selectedId={selectedId} onSelect={onSelect} />
    </section>
  )
}

function MobileDetail() {
  return (
    <section
      aria-label="Деталі вакансії"
      className="flex h-full min-h-0 flex-col bg-background"
    >
      <header className="flex h-12 shrink-0 items-center border-b px-2">
        <NavLink
          to="/"
          className="inline-flex h-[44px] items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium outline-none hover:bg-state-hover focus-visible:ring-2 focus-visible:ring-primary"
        >
          <HugeiconsIcon icon={ArrowLeft02Icon} />
          До списку
        </NavLink>
      </header>
      <div className="grid min-h-0 flex-1 place-items-center overflow-y-auto p-4 text-center text-sm text-muted-foreground">
        Виберіть вакансію зі списку
      </div>
    </section>
  )
}

function FilterSheet({ iconOnly = false }: { iconOnly?: boolean }) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size={iconOnly ? "icon" : "sm"}
            className={iconOnly ? "size-[44px]" : undefined}
            aria-label={iconOnly ? "Фільтри" : undefined}
          />
        }
      >
        <HugeiconsIcon icon={FilterHorizontalIcon} />
        {!iconOnly && "Фільтри"}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Фільтри</SheetTitle>
          <SheetDescription>
            Налаштування фільтрів з’являться пізніше.
          </SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  )
}
