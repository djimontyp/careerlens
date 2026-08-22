import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, waitFor, within } from "storybook/test"

import { AuthenticatedLayout } from "@/components/authenticated-layout"
import type { User } from "@/features/auth/api"
import { SHELL_STORAGE_KEY, useShellStore } from "@/features/shell/store"

const user = {
  id: 1,
  email: "ada@example.com",
  first_name: "Ada",
  last_name: "Lovelace",
  avatar_url: null,
} satisfies User

const meta = {
  title: "Layout/AuthenticatedLayout",
  component: AuthenticatedLayout,
  parameters: { layout: "fullscreen" },
  args: {
    user,
    loggingOut: false,
    onLogout: fn(),
    children: <div className="p-4">Route content</div>,
  },
} satisfies Meta<typeof AuthenticatedLayout>

export default meta
type Story = StoryObj<typeof meta>

export const Desktop: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  beforeEach: () => {
    useShellStore.getState().setSidebarOpen(true)
  },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    const workspace = canvas.getByTestId("authenticated-workspace")
    const main = canvas.getByRole("main")
    const sidebar = within(
      canvasElement.querySelector('[data-sidebar="sidebar"]')!,
    )
    const sidebarSurface = canvasElement.querySelector(
      '[data-slot="sidebar-inner"]',
    )!
    const rail = canvas.getByRole("button", {
      name: "Згорнути або розгорнути бічну панель",
    })
    const toggle = canvas.getByRole("button", {
      name: "Перемкнути бічну панель",
    })

    await expect(canvas.getByRole("banner")).toBeVisible()
    await expect(canvas.getAllByText("CareerLens")[0]).toBeVisible()
    await expect(sidebar.getByText("ada@example.com")).toBeVisible()
    await expect(canvas.queryByRole("navigation")).toBeNull()
    await expect(main).toBeVisible()
    await expect(workspace.scrollHeight).toBe(workspace.clientHeight)
    const surfaceBox = sidebarSurface.getBoundingClientRect()
    const railBox = rail.getBoundingClientRect()
    const railLine = getComputedStyle(rail, "::after")

    await expect(
      Math.abs(railBox.left + railBox.width / 2 - surfaceBox.right),
    ).toBeLessThanOrEqual(1)
    await expect(railLine.top).toBe("16px")
    await expect(railLine.bottom).toBe("16px")

    await userEvent.click(toggle)
    await waitFor(() =>
      expect(sidebar.getByText("ada@example.com")).not.toBeVisible(),
    )
    const sidebarBox = sidebar
      .getByTestId("sidebar-user")
      .getBoundingClientRect()
    const avatarBox = sidebar
      .getByTestId("sidebar-user")
      .querySelector('[data-slot="avatar"]')!
      .getBoundingClientRect()

    await expect(
      Math.abs(
        sidebarBox.left +
          sidebarBox.width / 2 -
          (avatarBox.left + avatarBox.width / 2),
      ),
    ).toBeLessThanOrEqual(1)
  },
}

export const Mobile: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const workspace = canvas.getByTestId("authenticated-workspace")
    const banner = canvas.getByRole("banner")
    const header = within(banner)
    const brand = header.getByText("CareerLens")
    const avatar = header
      .getByRole("button", { name: "Профіль Ada Lovelace" })
      .querySelector('[data-slot="avatar"]')!

    await expect(canvas.getByRole("banner")).toBeVisible()
    await expect(header.getByText("CareerLens")).toBeVisible()
    await expect(
      canvas.getByRole("button", { name: "Профіль Ada Lovelace" }),
    ).toBeVisible()
    await expect(
      canvas.queryByRole("button", { name: "Перемкнути бічну панель" }),
    ).toBeNull()
    await expect(canvas.queryByRole("navigation")).toBeNull()
    await expect(workspace.scrollWidth).toBeLessThanOrEqual(
      workspace.clientWidth,
    )
    const bannerBox = banner.getBoundingClientRect()
    const brandBox = brand.getBoundingClientRect()
    const avatarBox = avatar.getBoundingClientRect()

    await expect(
      Math.abs(
        brandBox.left - bannerBox.left - (bannerBox.right - avatarBox.right),
      ),
    ).toBeLessThanOrEqual(1)
  },
}

export const PersistedCollapsed: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  beforeEach: async () => {
    localStorage.setItem(
      SHELL_STORAGE_KEY,
      JSON.stringify({ state: { sidebarOpen: false }, version: 0 }),
    )
    await useShellStore.persist.rehydrate()

    return () => {
      localStorage.removeItem(SHELL_STORAGE_KEY)
    }
  },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    const sidebar = within(
      canvasElement.querySelector('[data-sidebar="sidebar"]')!,
    )
    const toggle = canvas.getByRole("button", {
      name: "Перемкнути бічну панель",
    })

    await expect(sidebar.getByText("ada@example.com")).not.toBeVisible()
    await userEvent.click(toggle)
    await waitFor(() =>
      expect(sidebar.getByText("ada@example.com")).toBeVisible(),
    )
    await expect(
      JSON.parse(localStorage.getItem(SHELL_STORAGE_KEY)!).state.sidebarOpen,
    ).toBe(true)
  },
}
