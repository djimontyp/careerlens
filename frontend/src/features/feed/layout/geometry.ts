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

/** Fit preferences without mutating them. A single panel may be below its split minimum. */
export function fitPanels(
  available: number,
  gap: number,
  order: FeedPanel[],
  visibility: Record<FeedPanel, boolean>,
  preferences: Record<FeedPanel, number>,
  detailSelected: boolean,
): { order: FeedPanel[]; widths: Record<FeedPanel, number> } {
  const budget = Math.max(0, available)
  let visible = order.filter((panel) => visibility[panel])
  const minimum = (panels: FeedPanel[]) =>
    panels.reduce((total, panel) => total + PANEL_MIN_WIDTH[panel], 0) +
    Math.max(0, panels.length - 1) * gap
  if (minimum(visible) > budget)
    visible = visible.filter((panel) => panel !== "filters")
  if (minimum(visible) > budget && visible.length > 1) {
    visible = [detailSelected ? "detail" : "list"]
  }
  const widths = { ...preferences }
  if (visible.length === 1) {
    widths[visible[0]] = budget
    return { order: visible, widths }
  }
  const usable = budget - Math.max(0, visible.length - 1) * gap
  for (const panel of visible)
    widths[panel] = Math.max(PANEL_MIN_WIDTH[panel], preferences[panel])
  const total = visible.reduce((sum, panel) => sum + widths[panel], 0)
  if (total > usable) {
    const slack = visible.reduce(
      (sum, panel) => sum + widths[panel] - PANEL_MIN_WIDTH[panel],
      0,
    )
    for (const panel of visible) {
      widths[panel] -=
        ((total - usable) * (widths[panel] - PANEL_MIN_WIDTH[panel])) / slack
    }
  } else if (visible.length) {
    widths[
      visible.includes("detail") ? "detail" : visible[visible.length - 1]
    ] += usable - total
  }
  return { order: visible, widths }
}
