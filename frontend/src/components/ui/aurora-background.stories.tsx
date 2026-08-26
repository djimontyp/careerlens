import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect } from "storybook/test"

import { AuroraBackground } from "@/components/ui/aurora-background"

const meta = {
  title: "Layout/AuroraBackground",
  component: AuroraBackground,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="relative h-svh overflow-hidden bg-muted p-3">
        <Story />
        <div className="relative mx-auto h-full max-w-5xl rounded-2xl border bg-background/72 backdrop-blur-xl" />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const background = canvasElement.querySelector(
      '[data-slot="aurora-background"]',
    )!

    await expect(background).toHaveAttribute("aria-hidden", "true")
    await expect(background.firstElementChild).toHaveClass(
      "motion-reduce:animate-none",
    )
  },
} satisfies Meta<typeof AuroraBackground>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = {}

export const Dark: Story = {
  globals: { theme: "dark" },
}
