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

export const DetailAnalysis: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  parameters: { initialEntries: ["/?vacancy=42"] },
  beforeEach: () => {
    const fetch = window.fetch
    window.fetch = async (input) => {
      if (String(input).includes("feed/42")) {
        return Response.json({
          id: 42,
          title: "Senior Python Developer",
          company: "Acme",
          location: "Remote",
          posted_date: "2026-08-21",
          scraped_at: "2026-08-21T10:30:00Z",
          source_updated_at: null,
          is_deftech: false,
          source: { code: "dou", name: "DOU", icon_url: null },
          url: "https://example.com/jobs/42",
          description: "Build reliable Django services.",
          description_status: "source",
          match: {
            score: 86,
            reason: "Strong Python and Django overlap.",
            evidence: {
              items: [
                {
                  type: "strong",
                  label: "Python",
                  explanation: "Five years of experience.",
                },
              ],
              evidence_coverage: 0.86,
            },
            precise: true,
            scored_at: "2026-08-21T12:00:00Z",
          },
        })
      }
      return Response.json({ items: [], next_cursor: null })
    }
    return () => (window.fetch = fetch)
  },
  play: async ({ canvasElement, userEvent }) => {
    const detail = within(
      within(canvasElement).getByRole("region", {
        name: "Деталі вакансії",
      }),
    )

    await expect(
      await detail.findByText("Senior Python Developer"),
    ).toBeVisible()
    await expect(
      detail.getByText("Build reliable Django services."),
    ).toBeVisible()
    await expect(
      detail.getByRole("region", { name: "AI-аналіз відповідності" }),
    ).toBeVisible()
    await expect(detail.getByText("86%")).toBeVisible()
    await expect(detail.getByText("Покриття доказами 86%")).toBeVisible()
    await expect(
      detail.getByRole("link", { name: "Відкрити на DOU" }),
    ).toHaveAttribute("href", "https://example.com/jobs/42")
    await userEvent.click(detail.getByText("Показати деталі"))
    await expect(detail.getByText("Сильні збіги (1)")).toBeVisible()
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
