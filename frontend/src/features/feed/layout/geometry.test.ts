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
