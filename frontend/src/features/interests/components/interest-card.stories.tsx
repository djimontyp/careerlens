import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, screen, waitFor, within } from "storybook/test"

import type { Interest } from "@/features/interests/api"
import { InterestCard } from "@/features/interests/components/interest-card"

const interest: Interest = {
  id: 1,
  name: "Python Backend",
  keywords: ["python", "fastapi", "django", "pytest", "celery", "pydantic"],
  stop_words: ["senior", "lead"],
  sources: [
    { code: "djinni", name: "Djinni", icon_url: "/source-icons/djinni.png" },
    { code: "dou", name: "DOU", icon_url: "/source-icons/dou.png" },
    { code: "robota", name: "Robota.ua", icon_url: null },
    { code: "telegram", name: "Telegram", icon_url: null },
  ],
  is_active: false,
  created_at: "2026-09-24T10:00:00Z",
}

const longInterest: Interest = {
  ...interest,
  name: "Python Backend ".repeat(7).slice(0, 100),
  keywords: Array.from({ length: 30 }, (_, index) =>
    index === 0 ? "a".repeat(50) : `keyword-${index}`,
  ),
  stop_words: ["b".repeat(50), "lead"],
}

const meta = {
  title: "Interests/Card",
  component: InterestCard,
  parameters: { layout: "fullscreen" },
  args: {
    interest,
    onEdit: fn(),
    onToggleActive: fn(async () => undefined),
    onDelete: fn(),
  },
  decorators: [
    (Story) => (
      <div className="min-h-svh bg-background p-4">
        <ul className="mx-auto w-full max-w-3xl">
          <Story />
        </ul>
      </div>
    ),
  ],
} satisfies Meta<typeof InterestCard>

export default meta
type Story = StoryObj<typeof meta>

export const Composition: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvas, args }) => {
    const title = canvas.getByRole("heading", { name: args.interest.name })
    const keywords = canvas.getByRole("list", { name: "Ключові слова" })
    const sources = canvas.getByRole("list", { name: "Джерела" })
    const excluded = canvas.getByText("Не включати: senior, lead")
    expect(within(keywords).getAllByRole("listitem")).toHaveLength(6)
    expect(within(sources).getAllByRole("listitem")).toHaveLength(4)
    expect(canvas.queryByText("Ключові слова:")).not.toBeInTheDocument()
    expect(canvas.queryByText("Джерела:")).not.toBeInTheDocument()
    await expect(canvas.getByText("На паузі")).toBeVisible()
    await waitFor(() => {
      expect(keywords.getBoundingClientRect().top).toBeGreaterThan(
        title.getBoundingClientRect().bottom,
      )
      expect(excluded.getBoundingClientRect().top).toBeGreaterThan(
        keywords.getBoundingClientRect().bottom,
      )
      expect(sources.getBoundingClientRect().top).toBeGreaterThan(
        excluded.getBoundingClientRect().bottom,
      )
      expect(
        parseFloat(getComputedStyle(sources.parentElement!).borderTopWidth),
      ).toBeGreaterThan(0)
    })
  },
}

export const ActiveAllSources: Story = {
  args: {
    interest: { ...interest, is_active: true, stop_words: [], sources: [] },
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: "Призупинити: Python Backend" }),
    ).toBeVisible()
    await expect(canvas.getByText("Усі джерела")).toBeVisible()
    expect(canvas.queryByText("На паузі")).not.toBeInTheDocument()
    expect(canvas.queryByText(/^Не включати:/)).not.toBeInTheDocument()
  },
}

const longContent: Story["play"] = async ({ canvas, args, globals }) => {
  const widths: Record<string, number> = {
    mobile: 390,
    mobileBoundary: 767,
    desktopBoundary: 768,
    desktop: 1440,
  }
  expect(window.innerWidth).toBe(widths[globals.viewport.value])
  const title = canvas.getByRole("heading", { name: args.interest.name })
  const card = title.closest("li")!
  const status = canvas.getByText("На паузі")
  const toggle = canvas.getByRole("button", {
    name: `Відновити: ${args.interest.name}`,
  })
  const menu = canvas.getByRole("button", {
    name: `Дії: ${args.interest.name}`,
  })
  const keywords = canvas.getByRole("list", { name: "Ключові слова" })
  const sources = canvas.getByRole("list", { name: "Джерела" })
  await expect(title).toHaveAttribute("title", args.interest.name)
  expect(within(keywords).getAllByRole("listitem")).toHaveLength(30)
  await waitFor(() => {
    const bounds = card.getBoundingClientRect()
    expect(bounds.left).toBeGreaterThanOrEqual(0)
    expect(bounds.right).toBeLessThanOrEqual(window.innerWidth)
    expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth + 1)
    for (const element of [
      title,
      status,
      toggle,
      menu,
      keywords,
      sources,
      ...within(keywords).getAllByRole("listitem"),
    ]) {
      const rect = element.getBoundingClientRect()
      expect(rect.width).toBeGreaterThan(0)
      expect(rect.left).toBeGreaterThanOrEqual(bounds.left)
      expect(rect.right).toBeLessThanOrEqual(bounds.right + 1)
      expect(rect.bottom).toBeLessThanOrEqual(bounds.bottom + 1)
    }
    expect(title.getBoundingClientRect().right).toBeLessThanOrEqual(
      status.getBoundingClientRect().left,
    )
    expect(toggle.getBoundingClientRect().right).toBeLessThanOrEqual(
      menu.getBoundingClientRect().left,
    )
    if (window.innerWidth < 768) {
      expect(toggle.getBoundingClientRect().top).toBeGreaterThanOrEqual(
        title.getBoundingClientRect().bottom,
      )
      for (const action of [toggle, menu]) {
        expect(action.getBoundingClientRect().height).toBeGreaterThanOrEqual(44)
        expect(action.getBoundingClientRect().width).toBeGreaterThanOrEqual(44)
      }
    } else {
      expect(status.getBoundingClientRect().right).toBeLessThanOrEqual(
        toggle.getBoundingClientRect().left,
      )
    }
    expect(keywords.getBoundingClientRect().top).toBeGreaterThan(
      toggle.getBoundingClientRect().bottom,
    )
    expect(sources.getBoundingClientRect().top).toBeGreaterThan(
      keywords.getBoundingClientRect().bottom,
    )
  })
  sources.scrollIntoView({ block: "center" })
  await waitFor(() => {
    expect(sources.getBoundingClientRect().top).toBeGreaterThanOrEqual(0)
    expect(sources.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      window.innerHeight,
    )
  })
}

export const LongContentMobile: Story = {
  args: { interest: longInterest },
  globals: { viewport: { value: "mobile", isRotated: false } },
  play: longContent,
}

export const LongContentMobileBoundary: Story = {
  ...LongContentMobile,
  globals: { viewport: { value: "mobileBoundary", isRotated: false } },
}

export const LongContentDesktopBoundary: Story = {
  ...LongContentMobile,
  globals: { viewport: { value: "desktopBoundary", isRotated: false } },
}

export const LongContentDark: Story = {
  ...LongContentMobile,
  globals: { viewport: { value: "desktop", isRotated: false }, theme: "dark" },
}

export const KeyboardActions: Story = {
  play: async ({ canvas, userEvent, args }) => {
    const toggle = canvas.getByRole("button", {
      name: "Відновити: Python Backend",
    })
    const menu = canvas.getByRole("button", { name: "Дії: Python Backend" })
    toggle.focus()
    await userEvent.tab()
    await expect(menu).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await waitFor(() =>
      expect(
        screen.getByRole("menuitem", { name: "Редагувати" }),
      ).toHaveFocus(),
    )
    await userEvent.keyboard("{Enter}")
    await expect(args.onEdit).toHaveBeenCalledTimes(1)
    await expect(args.onEdit).toHaveBeenCalledWith(menu)
    await waitFor(() =>
      expect(screen.queryByRole("menu")).not.toBeInTheDocument(),
    )
    await waitFor(() => expect(menu).toHaveFocus())
    await userEvent.keyboard("{Enter}")
    await waitFor(() =>
      expect(
        screen.getByRole("menuitem", { name: "Редагувати" }),
      ).toHaveFocus(),
    )
    await userEvent.keyboard("{ArrowDown}")
    await waitFor(() =>
      expect(screen.getByRole("menuitem", { name: "Видалити" })).toHaveFocus(),
    )
    await userEvent.keyboard("{Escape}")
    await expect(args.onDelete).not.toHaveBeenCalled()
    await waitFor(() => expect(menu).toHaveFocus())
    await userEvent.tab({ shift: true })
    await expect(toggle).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await expect(args.onToggleActive).toHaveBeenCalledTimes(1)
    await expect(args.onToggleActive).toHaveBeenCalledWith(args.interest)
  },
}
