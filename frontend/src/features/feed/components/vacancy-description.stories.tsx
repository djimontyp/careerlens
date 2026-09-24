import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"

import type { VacancyDetail } from "@/features/feed/api"
import { VacancyDescription } from "@/features/feed/components/vacancy-description"

const baseVacancy: VacancyDetail = {
  id: 812,
  title: "Python Developer",
  company: "Northstar Labs",
  location: "Remote, Ukraine",
  posted_date: "2026-08-20",
  scraped_at: "2026-08-20T10:30:00Z",
  source_updated_at: null,
  is_deftech: false,
  source: { code: "dou", name: "DOU", icon_url: null },
  url: null,
  match: null,
  saved: false,
  hidden: false,
  seen: true,
  has_note: false,
  application_submitted_at: null,
  description: "",
  description_status: "source",
  note: "",
  application: null,
}

const meta = {
  title: "Feed/Vacancy Description",
  component: VacancyDescription,
} satisfies Meta<typeof VacancyDescription>

export default meta
type Story = StoryObj<typeof meta>

export const SourceTextPreservesIndentation: Story = {
  args: {
    vacancy: {
      ...baseVacancy,
      description_status: "source",
      description: "Вимоги:\n    - Python\n    - Django",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const text = await canvas.findByText(/Вимоги:/)
    await expect(getComputedStyle(text).whiteSpace).toBe("pre-wrap")
    await expect(text.textContent).toContain("    - Python")
  },
}

export const MarkdownImageRendersAsLink: Story = {
  args: {
    vacancy: {
      ...baseVacancy,
      description_status: "markdown",
      description: "![pixel](https://tracker.example/p.png)",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.queryByRole("img")).not.toBeInTheDocument()
    const link = await canvas.findByRole("link", { name: "pixel" })
    await expect(link).toHaveAttribute("href", "https://tracker.example/p.png")
    await expect(link).toHaveAttribute("rel", "noopener noreferrer nofollow")
    await expect(link).toHaveAttribute("target", "_blank")
  },
}

export const LinkedImageDoesNotNestAnchors: Story = {
  args: {
    vacancy: {
      ...baseVacancy,
      description_status: "markdown",
      description:
        "[![Company logo](https://cdn.example/logo.png)](https://company.example/careers)",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.queryByRole("img")).not.toBeInTheDocument()
    const links = canvas.getAllByRole("link", { name: "Company logo" })
    await expect(links).toHaveLength(1)
    await expect(links[0]).toHaveAttribute(
      "href",
      "https://company.example/careers",
    )
    await expect(canvasElement.querySelectorAll("a a")).toHaveLength(0)
  },
}

export const MarkdownHeadingsAreDemoted: Story = {
  args: {
    vacancy: {
      ...baseVacancy,
      description_status: "markdown",
      description: "# Title\n\n## Sub",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      await canvas.findByRole("heading", { level: 3, name: "Title" }),
    ).toBeVisible()
    await expect(
      canvas.getByRole("heading", { level: 4, name: "Sub" }),
    ).toBeVisible()
    await expect(
      canvas.queryByRole("heading", { level: 1 }),
    ).not.toBeInTheDocument()
    await expect(
      canvas.queryByRole("heading", { level: 2 }),
    ).not.toBeInTheDocument()
  },
}

export const MarkdownHeadingsDemotedRelativeToShallowestLevel: Story = {
  args: {
    vacancy: {
      ...baseVacancy,
      description_status: "markdown",
      description: "## Parent\n\n### Child",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      await canvas.findByRole("heading", { level: 3, name: "Parent" }),
    ).toBeVisible()
    await expect(
      canvas.getByRole("heading", { level: 4, name: "Child" }),
    ).toBeVisible()
    await expect(
      canvas.queryByRole("heading", { level: 1 }),
    ).not.toBeInTheDocument()
    await expect(
      canvas.queryByRole("heading", { level: 2 }),
    ).not.toBeInTheDocument()
    await expect(
      canvas.queryByRole("heading", { level: 5 }),
    ).not.toBeInTheDocument()
  },
}
