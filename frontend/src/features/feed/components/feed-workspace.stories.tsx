import type { Meta, StoryObj } from "@storybook/react-vite"
import { MemoryRouter } from "react-router-dom"
import { expect, fireEvent, fn, waitFor, within } from "storybook/test"

import { FeedWorkspace } from "@/features/feed/components/feed-workspace"
import {
  FEED_LAYOUT_STORAGE_KEY,
  useFeedLayoutStore,
} from "@/features/feed/layout/store"

const meta = {
  title: "Feed/Workspace",
  component: FeedWorkspace,
  parameters: { layout: "fullscreen" },
  beforeEach: () => {
    const fetch = window.fetch
    window.fetch = async () => Response.json({ items: [], next_cursor: null })
    localStorage.removeItem(FEED_LAYOUT_STORAGE_KEY)
    useFeedLayoutStore.getState().reset()
    return () => (window.fetch = fetch)
  },
  decorators: [
    (Story, context) => (
      <MemoryRouter initialEntries={context.parameters.initialEntries ?? ["/"]}>
        <div className="h-svh bg-muted p-3 [--workspace-gap:0.75rem] max-md:p-0">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof FeedWorkspace>

export default meta
type Story = StoryObj<typeof meta>

export const Desktop: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole("region", { name: "Список вакансій" }),
    ).toBeVisible()
    await expect(
      canvas.getByRole("region", { name: "Деталі вакансії" }),
    ).toBeVisible()
    await expect(
      canvas.getByRole("region", { name: "Фільтри вакансій" }),
    ).toBeVisible()
    await expect(canvas.getAllByRole("separator")).toHaveLength(2)
    await expect(
      canvas.getAllByRole("button", { name: /Перетягнути панель/ }),
    ).toHaveLength(3)
  },
}

export const Refresh: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  beforeEach: () => {
    const fetch = window.fetch
    window.fetch = fn(async () =>
      Response.json({
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
      }),
    )
    return () => (window.fetch = fetch)
  },
  play: async ({ canvasElement, userEvent }) => {
    const refresh = within(canvasElement).getByRole("button", {
      name: "Оновити вакансії",
    })

    await waitFor(() => expect(refresh).toBeEnabled())
    await waitFor(() =>
      expect(
        within(
          canvasElement.querySelector('[aria-label="Список вакансій"] header')!,
        ).getByText("Сьогодні"),
      ).toBeVisible(),
    )
    const dateJump = within(canvasElement).getByLabelText(
      "Вибрана дата",
    ) as HTMLInputElement
    dateJump.showPicker = fn()
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Перейти до дати" }),
    )
    await expect(dateJump.showPicker).toHaveBeenCalledOnce()
    fireEvent.change(dateJump, {
      target: { value: new Date().toISOString().slice(0, 10) },
    })
    await expect(dateJump).toHaveValue("")
    await userEvent.click(refresh)
    await waitFor(() => expect(window.fetch).toHaveBeenCalledTimes(2))
  },
}

export const DesktopResize: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    const [separator] = canvas.getAllByRole("separator")
    const before = useFeedLayoutStore.getState().widths

    separator.focus()
    await userEvent.keyboard("{ArrowRight}")

    const after = useFeedLayoutStore.getState().widths
    await expect(after.list).toBe(before.list + 10)
    await expect(after.detail).toBe(before.detail - 10)
    await expect(after.filters).toBe(before.filters)
    await expect(localStorage.getItem(FEED_LAYOUT_STORAGE_KEY)).toContain(
      `"list":${after.list}`,
    )
  },
}

export const MobileList: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const list = canvas.getByRole("region", { name: "Список вакансій" })

    await expect(list).toBeVisible()
    await expect(
      canvas.queryByRole("region", { name: "Деталі вакансії" }),
    ).toBeNull()
    await expect(canvas.queryByRole("separator")).toBeNull()
    await expect(
      canvas.queryByRole("button", { name: /Перетягнути панель/ }),
    ).toBeNull()
  },
}

export const MobileDetail: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
  parameters: { initialEntries: ["/feed/detail"] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole("region", { name: "Деталі вакансії" }),
    ).toBeVisible()
    await expect(
      canvas.queryByRole("region", { name: "Список вакансій" }),
    ).toBeNull()
    const back = canvas.getByRole("link", { name: "До списку" })

    await expect(back).toHaveAttribute("href", "/")
    await expect(back.getBoundingClientRect().height).toBeGreaterThanOrEqual(44)
  },
}
