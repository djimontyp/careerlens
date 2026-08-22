import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"

import { LoginPage } from "@/features/auth/components/login-page"

const meta = {
  title: "Auth/LoginPage",
  component: LoginPage,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof LoginPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Mobile: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
}

export const AuthenticationError: Story = {
  args: { authenticationFailed: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("alert")).toHaveTextContent(
      "Не вдалося завершити вхід. Спробуйте ще раз.",
    )
  },
}
