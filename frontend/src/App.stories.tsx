import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"

import App from "@/App"

const meta = {
  title: "App/Authentication",
  component: App,
  parameters: { layout: "fullscreen" },
  beforeEach: () => {
    const fetch = window.fetch
    window.fetch = async () =>
      new Response(JSON.stringify({ detail: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })

    return () => {
      window.fetch = fetch
    }
  },
} satisfies Meta<typeof App>

export default meta
type Story = StoryObj<typeof meta>

export const SignedOut: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      await canvas.findByRole("link", { name: "Увійти в акаунт" }),
    ).toHaveAttribute("href", "/login/")
  },
}
