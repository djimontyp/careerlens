import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, waitFor, within } from "storybook/test"

import avatarDemoUrl from "@/assets/avatar-demo.svg"
import { UserMenu } from "@/components/user-menu"
import type { User } from "@/features/auth/api"

const userWithAvatar = {
  id: 1,
  email: "ada@example.com",
  first_name: "Ada",
  last_name: "Lovelace",
  avatar_url: avatarDemoUrl,
} satisfies User

const meta = {
  title: "Components/UserMenu",
  component: UserMenu,
  args: {
    user: {
      id: 1,
      email: "ada@example.com",
      first_name: "Ada",
      last_name: "Lovelace",
      avatar_url: null,
    },
    loggingOut: false,
    onLogout: fn(),
  },
  decorators: [
    (Story) => (
      <div className="flex justify-end p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof UserMenu>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement, userEvent, args }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("button", { name: "Профіль Ada Lovelace" })

    await expect(trigger).toHaveTextContent("AL")
    await userEvent.click(trigger)

    let popup: HTMLElement | null = null
    await waitFor(() => {
      popup = document.getElementById(
        trigger.getAttribute("aria-controls") ?? "",
      )
      expect(popup).toBeVisible()
    })
    const menu = within(popup!)
    await expect(menu.getByText("ada@example.com")).toBeVisible()
    const theme = menu.getByRole("menuitem", { name: /тема/i })
    await expect(theme).toBeVisible()

    await userEvent.click(menu.getByRole("menuitem", { name: "Вийти" }))
    await expect(args.onLogout).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(document.getElementById(popup!.id)).toBeNull())
  },
}

export const MissingName: Story = {
  args: {
    user: {
      id: 2,
      email: "person@example.com",
      first_name: null,
      last_name: null,
      avatar_url: null,
    },
  },
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button", {
      name: "Профіль person@example.com",
    })

    await expect(trigger).toHaveTextContent("P")
  },
}

export const WithAvatar: Story = {
  args: { user: userWithAvatar },
  play: async ({ canvasElement }) => {
    const avatar = await within(canvasElement).findByRole("img", {
      name: "Аватар Ada Lovelace",
    })

    await expect(avatar).toBeVisible()
  },
}

export const LoggingOut: Story = {
  args: { loggingOut: true },
  play: async ({ canvasElement, userEvent }) => {
    const trigger = within(canvasElement).getByRole("button", {
      name: "Профіль Ada Lovelace",
    })
    await userEvent.click(trigger)

    let popup: HTMLElement | null = null
    await waitFor(() => {
      popup = document.getElementById(
        trigger.getAttribute("aria-controls") ?? "",
      )
      expect(popup).toBeVisible()
    })
    const logout = within(popup!).getByRole("menuitem", { name: "Вихід…" })
    await expect(logout).toHaveAttribute("aria-disabled", "true")
    await userEvent.click(trigger)
    await waitFor(() =>
      expect(trigger).toHaveAttribute("aria-expanded", "false"),
    )
  },
}

export const MobileBoundary: Story = {
  tags: ["!dev"],
  globals: { viewport: { value: "mobileBoundary", isRotated: false } },
  play: async ({ canvasElement }) => {
    const name = within(canvasElement).getByText("Ada Lovelace")

    await expect(name).not.toBeVisible()
  },
}

export const DesktopBoundary: Story = {
  tags: ["!dev"],
  globals: { viewport: { value: "desktopBoundary", isRotated: false } },
  play: async ({ canvasElement }) => {
    const name = within(canvasElement).getByText("Ada Lovelace")

    await expect(name).toBeVisible()
  },
}
