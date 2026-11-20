import type { Meta, StoryObj } from "@storybook/react-vite"
import { MemoryRouter } from "react-router-dom"
import { expect } from "storybook/test"

import { InterestsCallout } from "@/features/interests/components/interests-callout"

const meta = {
  title: "Interests/Callout",
  component: InterestsCallout,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof InterestsCallout>
export default meta
type Story = StoryObj<typeof meta>

export const NoInterests: Story = {
  args: { variant: "none" },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Ще немає жодного інтересу")).toBeVisible()
    await expect(
      canvas.getByRole("link", { name: "Створити інтерес" }),
    ).toHaveAttribute("href", "/interests")
  },
}

export const AllPaused: Story = {
  args: { variant: "paused" },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Усі інтереси на паузі")).toBeVisible()
    await expect(
      canvas.getByRole("link", { name: "До інтересів" }),
    ).toHaveAttribute("href", "/interests")
  },
}

export const CompactOmitsExplanation: Story = {
  args: { variant: "paused", compact: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Усі інтереси на паузі")).toBeVisible()
    await expect(
      canvas.queryByText("Відновіть хоча б один, щоб бачити нові вакансії."),
    ).toBeNull()
  },
}
