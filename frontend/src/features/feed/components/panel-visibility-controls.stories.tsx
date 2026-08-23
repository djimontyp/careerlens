import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { PanelVisibilityControls } from "@/features/feed/components/panel-visibility-controls"

const meta = {
  title: "Feed/PanelVisibilityControls",
  component: PanelVisibilityControls,
  parameters: { layout: "centered" },
  args: {
    listVisible: true,
    detailVisible: true,
    filtersVisible: true,
    onToggleList: fn(),
    onToggleDetail: fn(),
    onToggleFilters: fn(),
  },
} satisfies Meta<typeof PanelVisibilityControls>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
}

export const DetailOnly: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: {
    listVisible: false,
    detailVisible: true,
    filtersVisible: false,
  },
}
