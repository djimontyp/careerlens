import assert from "node:assert/strict"
import test from "node:test"

import * as geometry from "./geometry.ts"
import type { FeedPanel } from "./geometry.ts"

const contract = geometry as typeof geometry & {
  reorderPanels?: (
    order: FeedPanel[],
    active: FeedPanel,
    over: FeedPanel,
  ) => FeedPanel[]
  resizeAdjacentPanels?: (
    leftWidth: number,
    rightWidth: number,
    nextLeftWidth: number,
    leftMin: number,
    rightMin: number,
  ) => { left: number; right: number }
  togglePanel?: (
    visibility: Record<FeedPanel, boolean>,
    panel: FeedPanel,
  ) => Record<FeedPanel, boolean>
}

test("reordering moves only the active panel", () => {
  assert.deepEqual(
    contract.reorderPanels?.(
      ["list", "detail", "filters"],
      "filters",
      "detail",
    ),
    ["list", "filters", "detail"],
  )
})

test("resizing changes only adjacent panels and preserves their total", () => {
  assert.deepEqual(contract.resizeAdjacentPanels?.(340, 300, 380, 280, 240), {
    left: 380,
    right: 260,
  })
  assert.deepEqual(contract.resizeAdjacentPanels?.(340, 300, 500, 280, 240), {
    left: 400,
    right: 240,
  })
})

test("visibility keeps one content panel and anchors pinned filters to list", () => {
  assert.deepEqual(
    contract.togglePanel?.({ list: true, detail: true, filters: true }, "list"),
    { list: false, detail: true, filters: false },
  )
  assert.deepEqual(
    contract.togglePanel?.(
      { list: false, detail: true, filters: false },
      "filters",
    ),
    { list: true, detail: true, filters: true },
  )
  assert.deepEqual(
    contract.togglePanel?.(
      { list: true, detail: false, filters: false },
      "list",
    ),
    { list: true, detail: false, filters: false },
  )
})

const fit = geometry as typeof geometry & {
  fitPanels?: (
    available: number,
    gap: number,
    order: FeedPanel[],
    visibility: Record<FeedPanel, boolean>,
    widths: Record<FeedPanel, number>,
    detailSelected: boolean,
  ) => { order: FeedPanel[]; widths: Record<FeedPanel, number> }
}

test("fit preserves the container budget and preferences at each minimum boundary", () => {
  assert.equal(typeof fit.fitPanels, "function")
  const preferences = { list: 660, detail: 640, filters: 300 }
  const original = { ...preferences }
  for (const available of [
    0, 200, 599, 611, 612, 613, 863, 864, 865, 1172, 2000,
  ]) {
    for (const order of [
      ["list", "detail", "filters"],
      ["filters", "detail", "list"],
    ] as FeedPanel[][]) {
      for (const visibility of [
        { list: true, detail: true, filters: true },
        { list: true, detail: true, filters: false },
        { list: true, detail: false, filters: true },
        { list: false, detail: true, filters: false },
      ]) {
        const result = fit.fitPanels!(
          available,
          12,
          order,
          visibility,
          preferences,
          false,
        )
        const total =
          result.order.reduce((sum, panel) => sum + result.widths[panel], 0) +
          Math.max(0, result.order.length - 1) * 12
        assert.ok(Math.abs(total - available) < 0.001, `${available}: ${total}`)
        for (const panel of result.order) {
          assert.ok(
            result.widths[panel] >=
              (result.order.length === 1 ? 0 : geometry.PANEL_MIN_WIDTH[panel]),
          )
        }
      }
    }
  }
  assert.deepEqual(preferences, original)
})

test("fit moves filters to overlay before switching to selected detail or list", () => {
  assert.equal(typeof fit.fitPanels, "function")
  const visibility = { list: true, detail: true, filters: true }
  const widths = { list: 340, detail: 640, filters: 300 }
  assert.deepEqual(
    fit.fitPanels!(
      864,
      12,
      geometry.DEFAULT_PANEL_ORDER,
      visibility,
      widths,
      true,
    ).order,
    ["list", "detail", "filters"],
  )
  assert.deepEqual(
    fit.fitPanels!(
      863,
      12,
      geometry.DEFAULT_PANEL_ORDER,
      visibility,
      widths,
      true,
    ).order,
    ["list", "detail"],
  )
  assert.deepEqual(
    fit.fitPanels!(
      611,
      12,
      geometry.DEFAULT_PANEL_ORDER,
      visibility,
      widths,
      true,
    ).order,
    ["detail"],
  )
  assert.deepEqual(
    fit.fitPanels!(
      611,
      12,
      geometry.DEFAULT_PANEL_ORDER,
      visibility,
      widths,
      false,
    ).order,
    ["list"],
  )
})
