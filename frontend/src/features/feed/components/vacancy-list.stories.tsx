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

export const LoadedAndPaginated: Story = {
  beforeEach: () => {
    const fetch = window.fetch
    window.fetch = async () =>
      Response.json({
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
        count: 21,
      })
    return () => (window.fetch = fetch)
  },
  play: async ({ canvas, userEvent }) => {
    await expect(
      await canvas.findByRole("heading", { name: "Senior Python Developer" }),
    ).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Далі" }))
    await expect(await canvas.findByText("2 з 2")).toBeVisible()
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
    window.fetch = async () => Response.json({ items: [], count: 0 })
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
        : Response.json({ items: [], count: 0 })
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
