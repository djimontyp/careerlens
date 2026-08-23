export type FeedPanel = "list" | "detail" | "filters"

export const DEFAULT_PANEL_ORDER: FeedPanel[] = ["list", "detail", "filters"]

export const PANEL_MIN_WIDTH: Record<FeedPanel, number> = {
  list: 280,
  detail: 320,
  filters: 240,
}

export function reorderPanels(
  order: FeedPanel[],
  active: FeedPanel,
  over: FeedPanel,
): FeedPanel[] {
  const from = order.indexOf(active)
  const to = order.indexOf(over)
  if (from < 0 || to < 0 || from === to) return order

  const next = [...order]
  next.splice(to, 0, next.splice(from, 1)[0])
  return next
}

export function resizeAdjacentPanels(
  leftWidth: number,
  rightWidth: number,
  nextLeftWidth: number,
  leftMin: number,
  rightMin: number,
): { left: number; right: number } {
  const total = leftWidth + rightWidth
  const left = Math.min(Math.max(nextLeftWidth, leftMin), total - rightMin)
  return { left, right: total - left }
}

export function togglePanel(
  visibility: Record<FeedPanel, boolean>,
  panel: FeedPanel,
): Record<FeedPanel, boolean> {
  if (panel === "filters") {
    return visibility.filters
      ? { ...visibility, filters: false }
      : { ...visibility, list: true, filters: true }
  }

  if (visibility[panel] && !visibility[panel === "list" ? "detail" : "list"]) {
    return visibility
  }

  return {
    ...visibility,
    [panel]: !visibility[panel],
    filters: panel === "list" && visibility.list ? false : visibility.filters,
  }
}
