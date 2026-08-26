import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"

import { WorkspaceHeader } from "@/components/workspace-header"

const meta = {
  title: "Layout/WorkspaceHeader",
  component: WorkspaceHeader,
  parameters: { layout: "centered" },
  render: (args) => (
    <div className="h-64 w-96 overflow-y-auto rounded-2xl border bg-muted">
      <WorkspaceHeader
        {...args}
        className="sticky top-0 z-10 flex h-12 items-center border-b px-4"
      >
        <h2 className="text-sm font-semibold">Список вакансій</h2>
      </WorkspaceHeader>
      <div className="space-y-3 p-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="h-12 rounded-lg border bg-background" />
        ))}
      </div>
    </div>
  ),
} satisfies Meta<typeof WorkspaceHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Glass: Story = {
  play: async ({ canvasElement }) => {
    const header = within(canvasElement).getByRole("banner")
    const style = getComputedStyle(header)

    await expect(header).toHaveAttribute("data-slot", "workspace-header")
    await expect(style.backdropFilter).not.toBe("none")
    await expect(style.backgroundColor).toContain("/ 0.55)")
  },
}
