import type { Meta, StoryObj } from "@storybook/react-vite"
import { Monocle01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { MemoryRouter } from "react-router-dom"
import { expect, fn, waitFor, within } from "storybook/test"

import { AuthenticatedLayout } from "@/components/authenticated-layout"
import type { User } from "@/features/auth/api"
import {
  FeedDesktopActions,
  FeedMobileActions,
  FeedWorkspace,
} from "@/features/feed/components/feed-workspace"
import type { FeedResponse } from "@/features/feed/api"
import {
  FEED_LAYOUT_STORAGE_KEY,
  useFeedLayoutStore,
} from "@/features/feed/layout/store"
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
  decorators: [
    (Story, context) => (
      <MemoryRouter
        initialEntries={context.parameters.initialEntries ?? ["/feed"]}
      >
        <Story />
      </MemoryRouter>
    ),
  ],
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
    const navigation = canvas.getByRole("navigation", {
      name: "Основна навігація",
    })

    await expect(navigation).toBeVisible()
    await expect(
      within(navigation).getByRole("link", { name: "Стрічка" }),
    ).toHaveAttribute("aria-current", "page")
    for (const label of ["Інтереси", "Мій агент"]) {
      const destination = within(navigation).getByRole("button", {
        name: label,
      })
      await expect(destination).toHaveAttribute("aria-disabled", "true")
      await expect(destination).toHaveAttribute("tabindex", "-1")
    }
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
    const navigation = canvas.getByRole("navigation", {
      name: "Основна навігація",
    })
    const navigationBox = navigation.getBoundingClientRect()
    const workspaceBox = workspace.getBoundingClientRect()
    const feed = within(navigation).getByRole("link", { name: "Стрічка" })
    const interests = within(navigation).getByRole("button", {
      name: "Інтереси",
    })
    const agent = within(navigation).getByRole("button", {
      name: "Мій агент",
    })

    await expect(navigation).toBeVisible()
    await expect(feed).toHaveAttribute("aria-current", "page")
    await expect(within(navigation).getByText("Інтереси")).toBeVisible()
    await expect(within(navigation).getByText("Мій агент")).toBeVisible()
    await expect(interests).toBeDisabled()
    await expect(agent).toBeDisabled()
    for (const destination of [feed, interests, agent]) {
      await expect(
        destination.getBoundingClientRect().height,
      ).toBeGreaterThanOrEqual(44)
    }
    await expect(
      Math.abs(navigationBox.bottom - workspaceBox.bottom),
    ).toBeLessThanOrEqual(1)
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

export const NavigationRouting: Story = {
  parameters: { initialEntries: ["/unknown"] },
  play: async ({ canvasElement, userEvent }) => {
    const navigation = within(canvasElement).getByRole("navigation", {
      name: "Основна навігація",
    })
    const feed = within(navigation).getByRole("link", { name: "Стрічка" })

    await expect(feed).toHaveAttribute("href", "/feed")
    await expect(feed).not.toHaveAttribute("aria-current")
    await userEvent.click(feed)
    await waitFor(() => expect(feed).toHaveAttribute("aria-current", "page"))
  },
}

export const FeedDetailNavigation: Story = {
  parameters: { initialEntries: ["/feed/detail"] },
  play: async ({ canvasElement }) => {
    const navigation = within(canvasElement).getByRole("navigation", {
      name: "Основна навігація",
    })

    await expect(
      within(navigation).getByRole("link", { name: "Стрічка" }),
    ).toHaveAttribute("aria-current", "page")
  },
}

export const MobileFeedWorkspace: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
  beforeEach: () => {
    const fetch = window.fetch
    const feed = {
      items: [
        {
          id: 42,
          title: "Senior Python Developer",
          company: "Acme",
          location: "Remote",
          posted_date: new Date().toISOString().slice(0, 10),
          source: { code: "dou", name: "DOU", icon_url: null },
          url: null,
        },
      ],
      next_cursor: null,
    } satisfies FeedResponse
    window.fetch = async () => Response.json(feed)
    return () => (window.fetch = fetch)
  },
  args: {
    children: <FeedWorkspace />,
    headerTitle: "Стрічка",
    mobileHeaderIcon: <HugeiconsIcon icon={Monocle01Icon} />,
    mobileHeaderActions: <FeedMobileActions />,
  },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    const workspace = canvas.getByTestId("authenticated-workspace")
    const scrollRegion = canvas.getByTestId("feed-scroll-region")
    const [banner] = canvas.getAllByRole("banner")
    const header = within(banner)

    await expect(canvas.getAllByRole("banner")).toHaveLength(1)
    await expect(
      await canvas.findByRole("heading", { name: "Senior Python Developer" }),
    ).toBeVisible()
    await expect(header.getByRole("heading", { name: "Стрічка" })).toBeVisible()
    const filters = header.getByRole("button", { name: "Фільтри" })

    await expect(filters).toBeVisible()
    await expect(filters.getBoundingClientRect().width).toBeGreaterThanOrEqual(
      44,
    )
    await expect(filters.getBoundingClientRect().height).toBeGreaterThanOrEqual(
      44,
    )
    await userEvent.click(filters)
    await waitFor(() =>
      expect(within(document.body).getByRole("dialog")).toBeVisible(),
    )
    const close = within(document.body).getByRole("button", { name: "Close" })
    await expect(close.getBoundingClientRect().width).toBeGreaterThanOrEqual(44)
    await expect(close.getBoundingClientRect().height).toBeGreaterThanOrEqual(
      44,
    )
    await userEvent.keyboard("{Escape}")
    await waitFor(() =>
      expect(within(document.body).queryByRole("dialog")).toBeNull(),
    )
    await userEvent.click(
      header.getByRole("button", { name: "Профіль Ada Lovelace" }),
    )
    const menuItems = await waitFor(() =>
      within(document.body).getAllByRole("menuitem"),
    )
    for (const menuItem of menuItems) {
      await expect(
        Number.parseFloat(getComputedStyle(menuItem).minHeight),
      ).toBeGreaterThanOrEqual(44)
    }
    await userEvent.keyboard("{Escape}")
    await waitFor(() =>
      expect(within(document.body).queryAllByRole("menuitem")).toHaveLength(0),
    )

    await expect(
      scrollRegion.getBoundingClientRect().height /
        workspace.getBoundingClientRect().height,
    ).toBeGreaterThan(0.7)
  },
}

export const DesktopFeedWorkspace: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  beforeEach: () => {
    localStorage.removeItem(FEED_LAYOUT_STORAGE_KEY)
    useFeedLayoutStore.getState().reset()
    return () => useFeedLayoutStore.getState().reset()
  },
  args: {
    children: <FeedWorkspace />,
    headerTitle: "Стрічка",
    headerActions: <FeedDesktopActions />,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const header = within(
      canvas.getByRole("banner", { name: "Верхня навігація" }),
    )

    await expect(header.getByRole("heading", { name: "Стрічка" })).toBeVisible()
    const headerBox = header
      .getByRole("heading", { name: "Стрічка" })
      .closest("header")!
      .getBoundingClientRect()
    const separatorBox = header.getByRole("separator").getBoundingClientRect()

    await expect(
      Math.abs(
        separatorBox.top +
          separatorBox.height / 2 -
          (headerBox.top + headerBox.height / 2),
      ),
    ).toBeLessThanOrEqual(1)
    await expect(header.getByRole("button", { name: "Фільтри" })).toBeVisible()
    await expect(
      header.getByRole("button", { name: "Налаштувати вигляд" }),
    ).toBeVisible()
    await expect(
      canvas.getAllByRole("button", { name: "Фільтри" }),
    ).toHaveLength(1)
    await expect(
      canvas.getByRole("region", { name: "Список вакансій" }),
    ).toBeVisible()
  },
}

export const PersistedCollapsed: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  beforeEach: async () => {
    localStorage.setItem(
      SHELL_STORAGE_KEY,
      JSON.stringify({ state: { sidebarOpen: false }, version: 1 }),
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
    const userMenu = sidebar.getByRole("button", {
      name: "Профіль Ada Lovelace",
    })

    await expect(sidebar.getByText("ada@example.com")).not.toBeVisible()
    await userEvent.hover(userMenu)
    await expect(getComputedStyle(userMenu).backgroundColor).toBe(
      "rgba(0, 0, 0, 0)",
    )
    await userEvent.unhover(userMenu)
    await userEvent.click(toggle)
    await waitFor(() =>
      expect(sidebar.getByText("ada@example.com")).toBeVisible(),
    )
    await expect(
      JSON.parse(localStorage.getItem(SHELL_STORAGE_KEY)!).state.sidebarOpen,
    ).toBe(true)
  },
}
