import type { Meta, StoryObj } from "@storybook/react-vite"
import { MemoryRouter } from "react-router-dom"
import { expect } from "storybook/test"

import { VacancyList } from "@/features/feed/components/vacancy-list"

const meta = {
  title: "Feed/VacancyList",
  component: VacancyList,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div className="flex h-[32rem] w-96 flex-col border bg-background">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof VacancyList>

export default meta
type Story = StoryObj<typeof meta>

export const LoadedAndInfinite: Story = {
  beforeEach: () => {
    const fetch = window.fetch
    window.fetch = async (input) => {
      const url = String(input)
      return Response.json(
        url.includes("cursor=next")
          ? {
              items: [
                {
                  id: 41,
                  title: "Older Django Developer",
                  company: null,
                  location: null,
                  posted_date: null,
                  source: { code: "telegram", name: "Telegram" },
                  url: null,
                },
              ],
              next_cursor: null,
            }
          : {
              items: [
                {
                  id: 42,
                  title: "Senior Python Developer",
                  company: "Acme",
                  location: "Remote",
                  posted_date: "2026-08-21",
                  source: { code: "dou", name: "DOU" },
                  url: "https://example.com/jobs/42",
                },
              ],
              next_cursor: "next",
            },
      )
    }
    return () => (window.fetch = fetch)
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("heading", { name: "Senior Python Developer" }),
    ).toBeVisible()
    await expect(
      await canvas.findByRole("heading", { name: "Older Django Developer" }),
    ).toBeVisible()
    await expect(
      canvas.queryByRole("navigation", { name: "Сторінки вакансій" }),
    ).not.toBeInTheDocument()
  },
}

export const RetryAfterLoadMoreError: Story = {
  beforeEach: () => {
    const fetch = window.fetch
    let calls = 0
    window.fetch = async () => {
      calls += 1
      if (calls === 2) return new Response(null, { status: 500 })
      return Response.json({
        items: [
          {
            id: calls === 1 ? 42 : 41,
            title:
              calls === 1
                ? "Senior Python Developer"
                : "Older Django Developer",
            company: "Acme",
            location: "Remote",
            posted_date: "2026-08-21",
            source: { code: "dou", name: "DOU" },
            url: null,
          },
        ],
        next_cursor: calls === 1 ? "next" : null,
      })
    }
    return () => (window.fetch = fetch)
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole("button", { name: "Повторити завантаження" }),
    )
    await expect(
      await canvas.findByRole("heading", { name: "Older Django Developer" }),
    ).toBeVisible()
  },
}

export const Loading: Story = {
  beforeEach: () => {
    const fetch = window.fetch
    window.fetch = () => new Promise<Response>(() => undefined)
    return () => (window.fetch = fetch)
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Завантаження вакансій…")).toBeVisible()
  },
}

export const Empty: Story = {
  beforeEach: () => {
    const fetch = window.fetch
    window.fetch = async () => Response.json({ items: [], next_cursor: null })
    return () => (window.fetch = fetch)
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Вакансій поки немає")).toBeVisible()
  },
}

export const RetryAfterError: Story = {
  beforeEach: () => {
    const fetch = window.fetch
    let attempt = 0
    window.fetch = async () =>
      ++attempt === 1
        ? new Response(null, { status: 500 })
        : Response.json({ items: [], next_cursor: null })
    return () => (window.fetch = fetch)
  },
  play: async ({ canvas, userEvent }) => {
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Не вдалося завантажити вакансії.",
    )
    await userEvent.click(canvas.getByRole("button", { name: "Повторити" }))
    await expect(await canvas.findByText("Вакансій поки немає")).toBeVisible()
  },
}
