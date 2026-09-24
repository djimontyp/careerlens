import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, waitFor, within } from "storybook/test"

import type { VacancyDetail as VacancyDetailData } from "@/features/feed/api"
import { VacancyDetail } from "@/features/feed/components/vacancy-detail"
import { useFeedStateStore } from "@/features/feed/state/store"

const vacancy: VacancyDetailData = {
  id: 501,
  title: "Senior Backend Engineer",
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

// Renders the real VacancyDetail (the production component behind both the
// desktop panel header and the mobile in-article toolbar), not a copy of
// its markup, so a later change to either header stays guarded by these
// stories.
function DetailHarness({ withPanelHeader }: { withPanelHeader: boolean }) {
  return (
    <div className="flex h-[640px] w-full flex-col bg-background">
      <VacancyDetail id={vacancy.id} withPanelHeader={withPanelHeader} />
    </div>
  )
}

const meta = {
  title: "Feed/Vacancy State Actions",
  component: DetailHarness,
  beforeEach: () => {
    useFeedStateStore.setState({ overrides: {} })
    const originalFetch = window.fetch
    window.fetch = async (input, init) => {
      const url = String(input)
      if (init?.method === "PATCH" && url.includes(`feed/${vacancy.id}/state`))
        return new Response(null, { status: 500 })
      if (url.includes(`feed/${vacancy.id}`)) return Response.json(vacancy)
      throw new Error(`Unexpected request in story: ${url}`)
    }
    return () => {
      useFeedStateStore.setState({ overrides: {} })
      window.fetch = originalFetch
    }
  },
} satisfies Meta<typeof DetailHarness>

export default meta
type Story = StoryObj<typeof meta>

export const DesktopHeaderContainsErrorAt1024: Story = {
  args: { withPanelHeader: true },
  globals: { viewport: { value: "compactWorkspace", isRotated: false } },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      await canvas.findByRole("button", { name: "Приховати" }),
    )
    const alert = await canvas.findByRole("alert")
    await expect(alert).toHaveTextContent("Не вдалося оновити стан.")

    const header = canvasElement.querySelector<HTMLElement>(
      '[data-slot="workspace-header"]',
    )!
    await waitFor(() => {
      expect(header.scrollHeight).toBeLessThanOrEqual(header.clientHeight)
    })

    const headerRect = header.getBoundingClientRect()
    const alertRect = alert.getBoundingClientRect()
    await expect(alertRect.top).toBeGreaterThanOrEqual(headerRect.top)
    await expect(alertRect.bottom).toBeLessThanOrEqual(headerRect.bottom)
    await expect(alertRect.left).toBeGreaterThanOrEqual(headerRect.left)
    await expect(alertRect.right).toBeLessThanOrEqual(headerRect.right)
  },
}

export const DesktopHeaderContainsErrorAt1280: Story = {
  args: { withPanelHeader: true },
  globals: { viewport: { value: "compactMacbook", isRotated: false } },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      await canvas.findByRole("button", { name: "Приховати" }),
    )
    const alert = await canvas.findByRole("alert")
    await expect(alert).toHaveTextContent("Не вдалося оновити стан.")

    const header = canvasElement.querySelector<HTMLElement>(
      '[data-slot="workspace-header"]',
    )!
    await waitFor(() => {
      expect(header.scrollHeight).toBeLessThanOrEqual(header.clientHeight)
    })

    const headerRect = header.getBoundingClientRect()
    const alertRect = alert.getBoundingClientRect()
    await expect(alertRect.top).toBeGreaterThanOrEqual(headerRect.top)
    await expect(alertRect.bottom).toBeLessThanOrEqual(headerRect.bottom)
    await expect(alertRect.left).toBeGreaterThanOrEqual(headerRect.left)
    await expect(alertRect.right).toBeLessThanOrEqual(headerRect.right)
  },
}

// Mobile never renders the panel header: it shows the in-article toolbar
// (VacancyDetail with withPanelHeader=false), so this checks that layout
// instead of the desktop one.
export const MobileToolbarRecoversFromFailure: Story = {
  args: { withPanelHeader: false },
  globals: { viewport: { value: "mobile", isRotated: false } },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    const hide = await canvas.findByRole("button", { name: "Приховати" })
    await userEvent.click(hide)
    const alert = await canvas.findByRole("alert")
    await expect(alert).toBeVisible()
    await expect(alert).toHaveTextContent("Не вдалося оновити стан.")
    await expect(
      canvas.getByRole("button", { name: "Приховати" }),
    ).toBeEnabled()
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      canvasElement.clientWidth,
    )
  },
}
