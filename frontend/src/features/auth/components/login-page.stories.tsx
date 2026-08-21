import type { Meta, StoryObj } from "@storybook/react-vite"

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
  globals: { viewport: { value: "mobile1", isRotated: false } },
}
