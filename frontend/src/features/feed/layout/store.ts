import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

import {
  DEFAULT_PANEL_ORDER,
  PANEL_MIN_WIDTH,
  reorderPanels,
  resizeAdjacentPanels,
  togglePanel,
  type FeedPanel,
} from "@/features/feed/layout/geometry"

export const FEED_LAYOUT_STORAGE_KEY = "careerlens-feed-layout"

const DEFAULT_VISIBILITY: Record<FeedPanel, boolean> = {
  list: true,
  detail: true,
  filters: true,
}

const DEFAULT_WIDTHS: Record<FeedPanel, number> = {
  list: 340,
  detail: 640,
  filters: 300,
}

type FeedLayoutState = {
  order: FeedPanel[]
  visibility: Record<FeedPanel, boolean>
  widths: Record<FeedPanel, number>
  movePanel: (active: FeedPanel, over: FeedPanel) => void
  resizeBoundary: (
    left: FeedPanel,
    right: FeedPanel,
    nextLeftWidth: number,
  ) => void
  togglePanel: (panel: FeedPanel) => void
  reset: () => void
}

export const useFeedLayoutStore = create<FeedLayoutState>()(
  persist(
    (set) => ({
      order: DEFAULT_PANEL_ORDER,
      visibility: DEFAULT_VISIBILITY,
      widths: DEFAULT_WIDTHS,
      movePanel: (active, over) =>
        set((state) => ({ order: reorderPanels(state.order, active, over) })),
      resizeBoundary: (left, right, nextLeftWidth) =>
        set((state) => {
          const resized = resizeAdjacentPanels(
            state.widths[left],
            state.widths[right],
            nextLeftWidth,
            PANEL_MIN_WIDTH[left],
            PANEL_MIN_WIDTH[right],
          )
          return {
            widths: {
              ...state.widths,
              [left]: resized.left,
              [right]: resized.right,
            },
          }
        }),
      togglePanel: (panel) =>
        set((state) => ({
          visibility: togglePanel(state.visibility, panel),
        })),
      reset: () =>
        set({
          order: [...DEFAULT_PANEL_ORDER],
          visibility: { ...DEFAULT_VISIBILITY },
          widths: { ...DEFAULT_WIDTHS },
        }),
    }),
    {
      name: FEED_LAYOUT_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ order, visibility, widths }) => ({
        order,
        visibility,
        widths,
      }),
      version: 1,
    },
  ),
)
