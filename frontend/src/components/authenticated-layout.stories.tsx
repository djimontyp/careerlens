import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"

import { AuthenticatedLayout } from "@/components/authenticated-layout"

const meta = {
  title: "Layout/AuthenticatedLayout",
  component: AuthenticatedLayout,
  parameters: { layout: "fullscreen" },
  args: {
    header: null,
  },
} satisfies Meta<typeof AuthenticatedLayout>

export default meta
type Story = StoryObj<typeof meta>

export const Desktop: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const workspace = canvas.getByTestId("authenticated-workspace")
    const main = canvas.getByRole("main")

    await expect(canvas.getByRole("banner")).toBeVisible()
    await expect(main).toBeVisible()
    await expect(workspace.scrollHeight).toBe(workspace.clientHeight)
  },
}

export const Mobile: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
  play: async ({ canvasElement }) => {
    const workspace = within(canvasElement).getByTestId(
      "authenticated-workspace",
    )

    await expect(workspace.scrollWidth).toBeLessThanOrEqual(
      workspace.clientWidth,
    )
  },
}
