import type { Meta, StoryObj } from "@storybook/react-vite"
import { MemoryRouter } from "react-router-dom"
import { expect, fn, waitFor } from "storybook/test"

import { VacancyList } from "@/features/feed/components/vacancy-list"

const meta = {
  title: "Feed/VacancyList",
  component: VacancyList,
  args: { selectedId: null, onSelect: fn() },
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
      const now = new Date()
      const today = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
        .toISOString()
        .slice(0, 10)
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
                  scraped_at: new Date().toISOString(),
                  source_updated_at: null,
                  is_deftech: false,
                  source: {
                    code: "telegram",
                    name: "Telegram",
                    icon_url: null,
                  },
                  url: null,
                  match: null,
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
                  posted_date: today,
                  scraped_at: new Date().toISOString(),
                  source_updated_at: new Date().toISOString(),
                  is_deftech: true,
                  source: {
                    code: "dou",
                    name: "DOU",
                    icon_url: "/source-icons/dou.png",
                  },
                  url: "https://example.com/jobs/42",
                  match: {
                    score: 92,
                    reason: "Strong Python and Django overlap.",
                    evidence: {
                      items: [
                        {
                          type: "strong",
                          label: "Python",
                          explanation: "Five years of experience.",
                        },
                      ],
                      evidence_coverage: 0.92,
                    },
                    precise: true,
                    scored_at: new Date().toISOString(),
                  },
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
      await canvas.findByRole("heading", { name: /Senior Python Developer/ }),
    ).toBeVisible()
    await expect(
      await canvas.findByRole("heading", { name: /Older Django Developer/ }),
    ).toBeVisible()
    await expect(canvas.getByRole("group", { name: "Сьогодні" })).toBeVisible()
    await expect(
      canvas.getByRole("group", { name: "Дата невідома" }),
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
            source: { code: "dou", name: "DOU", icon_url: null },
            url: null,
            match: null,
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

export const CardPresentation: Story = {
  ...LoadedAndInfinite,
  args: {
    selectedId: 42,
    onSelect: fn(),
    onVisibleDateChange: fn(),
    jumpDate: "2020-01-01",
    onJumpComplete: fn(),
  },
  play: async ({ args, canvas, userEvent }) => {
    const vacancy = await canvas.findByRole("button", {
      name: /Senior Python Developer/,
    })
    await expect(vacancy).toHaveTextContent("Acme · Remote")
    await expect(vacancy).toHaveTextContent("DefTech")
    await expect(vacancy).toHaveTextContent("Оновлено")
    await expect(vacancy).toHaveTextContent("DOU")
    await expect(vacancy).toHaveTextContent("Сьогодні")
    await expect(vacancy).toHaveTextContent("92% відповідність")
    await expect(
      vacancy.querySelector('[data-match-tone="high"]'),
    ).toBeVisible()
    await expect(vacancy.querySelector("img")).toHaveAttribute(
      "src",
      "/source-icons/dou.png",
    )
    await expect(vacancy).toHaveClass("focus-visible:ring-2")
    await expect(vacancy).toHaveAttribute("aria-pressed", "true")
    await waitFor(() =>
      expect(args.onVisibleDateChange).toHaveBeenCalledWith(
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      ),
    )
    await waitFor(() => expect(args.onJumpComplete).toHaveBeenCalledOnce())
    const article = await canvas.findByRole("button", {
      name: /Older Django Developer/,
    })
    await expect(article).toHaveTextContent("Telegram")
    await expect(article).toHaveTextContent("Дата невідома")
    await expect(canvas.queryByText("Ще не оцінено")).not.toBeInTheDocument()
    await userEvent.click(article)
    await expect(args.onSelect).toHaveBeenCalledWith(41)
  },
}

export const Loading: Story = {
  beforeEach: () => {
    const fetch = window.fetch
    window.fetch = () => new Promise<Response>(() => undefined)
    return () => (window.fetch = fetch)
  },
  play: async ({ canvas }) => {
    const skeleton = canvas.getByRole("list", {
      name: "Завантаження вакансій",
    })
    await expect(skeleton).toHaveAttribute("aria-busy", "true")
    await expect(canvas.getAllByRole("listitem")).toHaveLength(8)
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
