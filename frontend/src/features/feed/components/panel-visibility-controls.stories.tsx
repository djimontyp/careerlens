import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, screen, waitFor, within } from "storybook/test"

import { PanelVisibilityControls } from "@/features/feed/components/panel-visibility-controls"
import { useFeedLayoutStore } from "@/features/feed/layout/store"

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

function PersistedLayoutControls() {
  const visibility = useFeedLayoutStore((state) => state.visibility)
  const togglePanel = useFeedLayoutStore((state) => state.togglePanel)
  return (
    <PanelVisibilityControls
      listVisible={visibility.list}
      detailVisible={visibility.detail}
      filtersVisible={visibility.filters}
      onToggleList={() => togglePanel("list")}
      onToggleDetail={() => togglePanel("detail")}
      onToggleFilters={() => togglePanel("filters")}
    />
  )
}

export const RestoresHiddenListAtWorkspaceBreakpoint: Story = {
  globals: { viewport: { value: "desktopBoundary", isRotated: false } },
  beforeEach: () => {
    useFeedLayoutStore.getState().reset()
    useFeedLayoutStore.setState({
      visibility: { list: false, detail: true, filters: false },
    })
    return () => useFeedLayoutStore.getState().reset()
  },
  render: () => <PersistedLayoutControls />,
  play: async ({ canvas, userEvent }) => {
    await expect(window.innerWidth).toBe(768)
    const trigger = canvas.getByRole("button", { name: "Налаштувати вигляд" })
    await expect(trigger).toBeVisible()
    await userEvent.click(trigger)
    const list = await screen.findByRole("menuitemcheckbox", {
      name: "Список вакансій",
    })
    await expect(list).toHaveAttribute("aria-checked", "false")
    await userEvent.click(list)
    await waitFor(() =>
      expect(useFeedLayoutStore.getState().visibility.list).toBe(true),
    )
    await waitFor(() =>
      expect(
        within(document.body).getByRole("menuitemcheckbox", {
          name: "Список вакансій",
        }),
      ).toHaveAttribute("aria-checked", "true"),
    )
  },
}
