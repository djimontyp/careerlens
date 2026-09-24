import type { Meta, StoryObj } from "@storybook/react-vite"
import { MemoryRouter } from "react-router-dom"
import { expect, fireEvent, fn, waitFor, within } from "storybook/test"

import { FeedWorkspace } from "@/features/feed/components/feed-workspace"
import {
  FEED_LAYOUT_STORAGE_KEY,
  useFeedLayoutStore,
} from "@/features/feed/layout/store"
import { useFeedStateStore } from "@/features/feed/state/store"

const meta = {
  title: "Feed/Workspace",
  component: FeedWorkspace,
  parameters: { layout: "fullscreen" },
  beforeEach: () => {
    const fetch = window.fetch
    window.fetch = async () => Response.json({ items: [], next_cursor: null })
    localStorage.removeItem(FEED_LAYOUT_STORAGE_KEY)
    useFeedLayoutStore.getState().reset()
    useFeedStateStore.setState({ overrides: {} })
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
    const filters = canvas.getByRole("region", { name: "Фільтри вакансій" })
    await expect(filters.scrollHeight).toBe(filters.clientHeight)
    await expect(canvas.getAllByRole("separator")).toHaveLength(2)
    await expect(
      canvas.getAllByRole("button", { name: /Перетягнути панель/ }),
    ).toHaveLength(3)
    const list = canvas.getByRole("region", { name: "Список вакансій" })
    const header = within(list)
      .getByRole("heading", { name: "Вакансії" })
      .closest("header")!

    await expect(getComputedStyle(header).position).toBe("absolute")
  },
}

export const ListMinimumWidth: Story = {
  globals: { viewport: { value: "desktopBoundary", isRotated: false } },
  beforeEach: () => {
    useFeedLayoutStore.setState((state) => ({
      widths: { ...state.widths, list: 280 },
    }))
  },
  play: async ({ canvasElement }) => {
    const list = within(canvasElement).getByRole("region", {
      name: "Список вакансій",
    })
    const header = within(list)
      .getByRole("heading", { name: "Вакансії" })
      .closest("header")!

    await expect(list.getBoundingClientRect().width).toBe(280)
    await expect(header.scrollWidth).toBeLessThanOrEqual(header.clientWidth)
    await expect(
      within(canvasElement).queryByRole("region", {
        name: "Фільтри вакансій",
      }),
    ).not.toBeInTheDocument()
  },
}

export const PinnedFiltersBoundary: Story = {
  globals: { viewport: { value: "compactWorkspace", isRotated: false } },
  play: async ({ canvasElement }) => {
    const filters = within(canvasElement).getByRole("region", {
      name: "Фільтри вакансій",
    })

    await expect(filters).toBeVisible()
    await expect(filters.scrollHeight).toBe(filters.clientHeight)
    await expect(filters.getBoundingClientRect().width).toBeGreaterThanOrEqual(
      240,
    )
  },
}

export const DetailAnalysis: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  parameters: { initialEntries: ["/?vacancy=42"] },
  beforeEach: ({ parameters }) => {
    const fetch = window.fetch
    let state = { saved: false, hidden: false, seen: false }
    window.fetch = async (input, init) => {
      if (String(input).includes("feed/42/state")) {
        if (init?.method !== "PATCH") {
          return new Response(null, { status: 405 })
        }
        const payload = JSON.parse(String(init?.body)) as Partial<typeof state>
        if (payload.hidden !== undefined && parameters.stateUpdateFails) {
          return new Response(null, { status: 500 })
        }
        state = { ...state, ...payload }
        return Response.json(state)
      }
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
          saved: false,
          hidden: false,
          seen: false,
          has_note: true,
          application_submitted_at: "2026-08-22",
          note: "Ask about on-call.",
          application: {
            submitted_at: "2026-08-22",
            cover_letter: "My cover letter.",
          },
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
    const company = detail.getByLabelText("Компанія")
    const location = detail.getByLabelText("Локація")
    const published = detail.getByLabelText("Дата публікації")

    await expect(company).toHaveTextContent("Acme")
    await expect(company.querySelector("svg")).not.toBeNull()
    await expect(location).toHaveTextContent("Remote")
    await expect(location.querySelector("svg")).not.toBeNull()
    await expect(published).toHaveTextContent("21 серпня 2026 р.")
    await expect(published.querySelector("svg")).not.toBeNull()
    await expect(detail.queryByText("Acme · Remote · DOU")).toBeNull()
    const actions = detail.getByRole("group", { name: "Швидкі дії вакансії" })
    const panelHeader = detail
      .getByRole("heading", { name: "Деталі вакансії" })
      .closest("header")!
    const vacancyHeader = detail
      .getByRole("heading", { name: "Senior Python Developer" })
      .closest("header")!
    const contextActions = detail.getByRole("group", {
      name: "Дії з деталями вакансії",
    })

    await expect(panelHeader).toContainElement(actions)
    await expect(vacancyHeader).toContainElement(contextActions)

    await expect(
      within(actions).getByRole("button", { name: "Зберегти" }),
    ).toBeVisible()
    await expect(
      within(actions).getByRole("button", { name: "Приховати" }),
    ).toBeVisible()
    await expect(
      detail.getByRole("link", { name: "Відкрити на DOU" }),
    ).toBeVisible()
    await expect(detail.getByText("Подано")).toBeVisible()
    await expect(
      detail.getByRole("button", { name: "Мої нотатки" }),
    ).toBeVisible()
    const header = detail
      .getByRole("heading", { name: "Senior Python Developer" })
      .closest("header")!
    const scrollRegion = detail.getByTestId("detail-scroll-region")

    await expect(getComputedStyle(header.parentElement!).position).toBe(
      "sticky",
    )
    const scrollRegionStyle = getComputedStyle(scrollRegion)
    await expect(Number.parseFloat(scrollRegionStyle.paddingTop)).toBe(
      Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
    )
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
    const matchDetails = detail.getByRole("button", {
      name: "Показати деталі",
    })
    await userEvent.click(matchDetails)
    await expect(matchDetails).toHaveAttribute("aria-expanded", "true")
    await waitFor(() =>
      expect(detail.getByText("Сильні збіги (1)")).toBeVisible(),
    )
    await waitFor(() =>
      expect(useFeedStateStore.getState().overrides[42]?.seen).toBeTruthy(),
    )
    const save = detail.getByRole("button", { name: "Зберегти" })
    await userEvent.click(save)
    await waitFor(() => expect(save).toHaveAttribute("aria-pressed", "true"))
    const hide = detail.getByRole("button", { name: "Приховати" })
    await userEvent.click(hide)
    await expect(
      await detail.findByText("Виберіть вакансію зі списку"),
    ).toBeVisible()
    const undo = await within(document.body).findByRole("button", {
      name: "Скасувати",
    })
    await userEvent.click(undo)
    await waitFor(() =>
      expect(useFeedStateStore.getState().overrides[42]?.hidden).toBeFalsy(),
    )
  },
}

export const DetailStateUpdateError: Story = {
  ...DetailAnalysis,
  parameters: {
    ...DetailAnalysis.parameters,
    stateUpdateFails: true,
  },
  play: async ({ canvasElement, userEvent }) => {
    const detail = within(
      within(canvasElement).getByRole("region", {
        name: "Деталі вакансії",
      }),
    )
    const hide = await detail.findByRole("button", { name: "Приховати" })

    await userEvent.click(hide)

    const alert = await detail.findByRole("alert")
    await expect(alert).toHaveTextContent("Не вдалося оновити стан.")
    await expect(hide).toHaveAttribute("aria-pressed", "false")

    // The error text must fit inside the fixed h-12 panel header instead of
    // wrapping the actions row onto a second line and growing the header.
    const panelHeader = detail
      .getByRole("heading", { name: "Деталі вакансії" })
      .closest("header")!
    await waitFor(() => {
      expect(panelHeader.scrollHeight).toBeLessThanOrEqual(
        panelHeader.clientHeight,
      )
    })
    const headerRect = panelHeader.getBoundingClientRect()
    await expect(headerRect.height).toBe(48)
    const alertRect = alert.getBoundingClientRect()
    await expect(alertRect.bottom).toBeLessThanOrEqual(headerRect.bottom)
  },
}

export const DetailGlass: Story = {
  ...DetailAnalysis,
  play: undefined,
}

export const WideDetailComposition: Story = {
  ...DetailAnalysis,
  globals: { viewport: { value: "ultrawide", isRotated: false } },
  play: async ({ canvasElement }) => {
    useFeedLayoutStore.setState({
      visibility: { list: true, detail: true, filters: false },
      widths: { list: 400, detail: 640, filters: 300 },
    })
    const canvas = within(canvasElement)
    const list = canvas.getByRole("region", { name: "Список вакансій" })
    const detail = within(
      canvas.getByRole("region", { name: "Деталі вакансії" }),
    )
    const listTitle = within(list).getByRole("heading", { name: "Вакансії" })
    const vacancyTitle = await detail.findByRole("heading", {
      name: "Senior Python Developer",
    })
    const vacancyHeader = vacancyTitle.closest("header")!
    const description = detail.getByText("Build reliable Django services.")
    const analysis = detail.getByRole("region", {
      name: "AI-аналіз відповідності",
    })

    await waitFor(() =>
      expect(
        canvas
          .getByRole("region", { name: "Деталі вакансії" })
          .getBoundingClientRect().width,
      ).toBeGreaterThan(1_000),
    )
    await expect(listTitle.scrollWidth).toBeLessThanOrEqual(
      listTitle.clientWidth,
    )
    await expect(vacancyHeader.getBoundingClientRect().height).toBeLessThan(100)
    await expect(
      analysis.getBoundingClientRect().left -
        description.getBoundingClientRect().right,
    ).toBeLessThanOrEqual(80)
  },
}

export const DetailWithNullableFields: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  parameters: { initialEntries: ["/?vacancy=43"] },
  beforeEach: () => {
    const fetch = window.fetch
    window.fetch = async (input) =>
      Response.json(
        String(input).includes("feed/43")
          ? {
              id: 43,
              title: "Backend Developer",
              company: null,
              location: null,
              posted_date: null,
              scraped_at: "2026-08-21T10:30:00Z",
              source_updated_at: null,
              is_deftech: false,
              source: { code: "telegram", name: "Telegram", icon_url: null },
              url: null,
              description: "Вакансія з Telegram.",
              description_status: "source",
              saved: false,
              hidden: false,
              seen: true,
              has_note: false,
              application_submitted_at: null,
              note: "",
              application: null,
              match: null,
            }
          : { items: [], next_cursor: null },
      )
    return () => (window.fetch = fetch)
  },
  play: async ({ canvasElement }) => {
    const detail = within(
      within(canvasElement).getByRole("region", {
        name: "Деталі вакансії",
      }),
    )

    await expect(await detail.findByText("Backend Developer")).toBeVisible()
    await expect(detail.getByLabelText("Локація")).toHaveTextContent(
      "Локацію не вказано",
    )
    await expect(detail.queryByText("Віддалено")).not.toBeInTheDocument()
    await expect(detail.queryByLabelText("Компанія")).toBeNull()
    await expect(detail.getByLabelText("Дата публікації")).toHaveTextContent(
      "Дата невідома",
    )
    await expect(detail.getByText("Вакансія з Telegram.")).toBeVisible()
    await expect(
      detail.queryByRole("link", { name: /Відкрити на/ }),
    ).not.toBeInTheDocument()
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
            posted_date: new Intl.DateTimeFormat("sv-SE").format(),
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
      target: { value: new Intl.DateTimeFormat("sv-SE").format() },
    })
    await expect(dateJump).toHaveValue("")
    await userEvent.click(refresh)
    await waitFor(() => expect(window.fetch).toHaveBeenCalledTimes(2))
  },
}

export const SavedModeDirectUrl: Story = {
  parameters: { initialEntries: ["/?mode=saved"] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      await canvas.findByText("Немає збережених вакансій"),
    ).toBeVisible()
    await expect(
      canvas.queryByRole("button", { name: /^Режим:/ }),
    ).not.toBeInTheDocument()
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
  ...DetailWithNullableFields,
  globals: { viewport: { value: "mobile", isRotated: false } },
  parameters: { initialEntries: ["/feed/detail?mode=saved&vacancy=43"] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole("region", { name: "Деталі вакансії" }),
    ).toBeVisible()
    await expect(
      canvas.queryByRole("region", { name: "Список вакансій" }),
    ).toBeNull()
    const back = canvas.getByRole("link", { name: "До списку" })

    await expect(await canvas.findByText("Backend Developer")).toBeVisible()
    const vacancyHeader = canvas
      .getByRole("heading", { name: "Backend Developer" })
      .closest("header")!
    const scrollRegion = canvas.getByTestId("detail-scroll-region")

    await expect(vacancyHeader.getBoundingClientRect().height).toBeGreaterThan(
      80,
    )
    const scrollRegionStyle = getComputedStyle(scrollRegion)
    await expect(Number.parseFloat(scrollRegionStyle.paddingTop)).toBe(
      Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
    )
    await expect(back).toHaveAttribute("href", "/feed?mode=saved")
    await expect(back.getBoundingClientRect().height).toBeGreaterThanOrEqual(44)
  },
}

export const MobileDetailAnalysis: Story = {
  ...DetailAnalysis,
  globals: { viewport: { value: "mobile", isRotated: false } },
  parameters: { initialEntries: ["/feed/detail?vacancy=42"] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const description = await canvas.findByText(
      "Build reliable Django services.",
    )
    const analysis = canvas.getByRole("region", {
      name: "AI-аналіз відповідності",
    })

    await expect(
      analysis.getBoundingClientRect().top -
        description.getBoundingClientRect().bottom,
    ).toBeLessThanOrEqual(32)
    await expect(analysis.getBoundingClientRect().height).toBeLessThan(240)
  },
}
