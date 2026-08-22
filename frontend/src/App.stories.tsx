import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"

import App from "@/App"

const meta = {
  title: "App/Authentication",
  component: App,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof App>

export default meta
type Story = StoryObj<typeof meta>

export const SignedOut: Story = {
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      await canvas.findByRole("button", { name: "Увійти в акаунт" }),
    ).toHaveAttribute("href", "/login/")
  },
}

export const RetryAfterError: Story = {
  beforeEach: () => {
    const fetch = window.fetch
    let attempt = 0
    window.fetch = async () => {
      attempt += 1
      if (attempt === 1) return new Response(null, { status: 500 })
      return Response.json({
        id: 1,
        email: "ada@example.com",
        first_name: "Ada",
        last_name: "Lovelace",
      })
    }

    return () => {
      window.fetch = fetch
    }
  },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Не вдалося перевірити сесію.",
    )

    await userEvent.click(canvas.getByRole("button", { name: "Повторити" }))

    await expect(await canvas.findByText("ada@example.com")).toBeVisible()
  },
}

export const SignedIn: Story = {
  beforeEach: () => {
    const fetch = window.fetch
    window.fetch = async () =>
      Response.json({
        id: 1,
        email: "ada@example.com",
        first_name: "Ada",
        last_name: "Lovelace",
      })

    return () => {
      window.fetch = fetch
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText("ada@example.com")).toBeVisible()
    await expect(canvas.getByRole("button", { name: "Вийти" })).toBeVisible()
  },
}
