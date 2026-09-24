import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import {
  expect,
  fireEvent,
  fn,
  userEvent,
  waitFor,
  within,
} from "storybook/test"

import { VacancyDetail } from "@/features/feed/components/vacancy-detail"
import { VacancyList } from "@/features/feed/components/vacancy-list"
import { useFeedStateStore } from "@/features/feed/state/store"
import { useVacancyNotesStore } from "@/features/feed/state/notes"
import { useVacancyApplicationsStore } from "@/features/feed/state/applications"

const detail = {
  id: 42,
  title: "Senior Python Developer",
  company: "Northstar Labs",
  location: "Remote, Ukraine",
  posted_date: "2026-08-20",
  scraped_at: "2026-08-20T10:30:00Z",
  source_updated_at: "2026-08-21T11:45:00Z",
  is_deftech: false,
  source: { code: "dou", name: "DOU", icon_url: null },
  url: "https://jobs.dou.ua/companies/northstar/vacancies/42/",
  description: `## Про продукт

Northstar Labs розвиває B2B-платформу для команд, які керують критичними операційними процесами. Продуктом щодня користуються тисячі фахівців у Європі та Північній Америці, тому для нас важливі **надійність**, зрозуміла архітектура й уважність до деталей.

Ми шукаємо Senior Python Developer, який підсилить backend-команду та допоможе розвивати сервіси без зайвої складності.

> Ви матимете вплив на технічні рішення: від API-контрактів до спостережуваності production-систем.

## Що потрібно робити

- проєктувати та розвивати API на **Python** і **Django**;
- оптимізувати запити до PostgreSQL та фонові задачі;
- підтримувати автоматичні перевірки, code review і технічну документацію;
- разом із product-командою розбивати великі задачі на безпечні вертикальні порції;
- аналізувати інциденти та покращувати метрики, логи й алерти.

## Що для нас важливо

1. Від 4 років комерційного досвіду з Python.
2. Практичне розуміння Django ORM, транзакцій і REST API.
3. Досвід із PostgreSQL, Redis та асинхронними задачами.
4. Уміння писати тести з чітким продуктним результатом.
5. Англійська від **Upper-Intermediate** для регулярної комунікації.

## Технології

| Напрям | Інструменти |
| --- | --- |
| Backend | Python 3.13, Django, Django Ninja |
| Data | PostgreSQL, Redis |
| Delivery | Docker, GitHub Actions |
| Observability | Sentry, Prometheus, Grafana |

У сервісах ми віддаємо перевагу явним типам і невеликим функціям. Наприклад, новий endpoint має зберігати контракт на кшталт \`Result[Vacancy, DomainError]\`, а не приховувати помилки за універсальними винятками.

## Ми пропонуємо

- повністю віддалену роботу в Україні;
- гнучкий початок робочого дня;
- 25 робочих днів відпустки та оплачувані лікарняні;
- бюджет на навчання, конференції й англійську;
- техніку на вибір і регулярні перегляди компенсації.

Про команду та процес найму можна прочитати на [сторінці Northstar Labs](https://example.com/team). Процес складається зі знайомства, технічної розмови та фінальної зустрічі з командою.`,
  description_status: "markdown",
  saved: false,
  hidden: false,
  seen: true,
  has_note: true,
  application_submitted_at: "2026-08-22",
  note: "Уточнити on-call.",
  application: {
    submitted_at: "2026-08-22",
    cover_letter: "Мій супровідний текст.",
  },
  match: {
    score: 86,
    reason: "Сильний збіг Python і Django.",
    evidence: {
      items: [
        {
          type: "strong" as const,
          label: "Python",
          explanation: "П'ять років досвіду.",
        },
        {
          type: "strong" as const,
          label: "Django",
          explanation: "Комерційний досвід підтверджено.",
        },
        {
          type: "partial" as const,
          label: "PostgreSQL",
          explanation: "Є досвід оптимізації запитів.",
        },
        {
          type: "gaps" as const,
          label: "AWS",
          explanation: "Немає підтвердження.",
        },
        {
          type: "gaps" as const,
          label: "Kubernetes",
          explanation: "Лише базовий досвід.",
        },
        {
          type: "unknown" as const,
          label: "On-call",
          explanation: "У резюме не зазначено.",
        },
      ],
      evidence_coverage: 0.86,
    },
    precise: true,
    scored_at: "2026-08-21T12:00:00Z",
  },
}

const requestLog = fn()
let resolvePendingNote: ((response: Response) => void) | null = null
let refreshedNote: string | undefined
const pendingNotes: Array<{
  note: string
  resolve: (response: Response) => void
}> = []

function DetailWithList() {
  return (
    <>
      <section aria-label="Список для перевірки" className="flex w-80 shrink-0">
        <VacancyList selectedId={42} onSelect={() => undefined} />
      </section>
      <VacancyDetail id={42} />
    </>
  )
}

function VacancyNavigationHarness() {
  const [id, setId] = useState(42)
  return (
    <>
      <button type="button" onClick={() => setId(43)}>
        Наступна вакансія
      </button>
      <button type="button" onClick={() => setId(42)}>
        Попередня вакансія
      </button>
      <VacancyDetail id={id} />
    </>
  )
}

const meta = {
  title: "Feed/Vacancy Detail",
  component: VacancyDetail,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="flex h-svh min-w-0 bg-background">
        <Story />
      </div>
    ),
  ],
  beforeEach: ({ parameters }) => {
    const originalFetch = window.fetch
    let vacancyState = { saved: false, hidden: false, seen: true }
    const storyParameters = parameters as {
      vacancyDetail?: typeof detail
      failNote?: boolean
      failApplication?: boolean
      delayNote?: boolean
      failLoadOnce?: boolean
    }
    requestLog.mockClear()
    refreshedNote = undefined
    useVacancyNotesStore.getState().reset()
    useVacancyApplicationsStore.getState().reset()
    pendingNotes.length = 0
    let failNote = storyParameters.failNote
    let failLoadOnce = storyParameters.failLoadOnce
    resolvePendingNote = null
    useFeedStateStore.setState({ overrides: {} })
    window.fetch = async (input, init) => {
      const url = String(input)
      requestLog(url, init)
      if (init?.method === "PUT") {
        if (url.includes("/note") && failNote) {
          failNote = false
          return Response.json({}, { status: 500 })
        }
        if (url.includes("/application") && storyParameters.failApplication)
          return Response.json({}, { status: 500 })
        if (url.includes("/note") && storyParameters.delayNote)
          return new Promise<Response>((resolve) => {
            resolvePendingNote = resolve
            pendingNotes.push({
              note: JSON.parse(String(init.body)).note,
              resolve,
            })
          })
        return Response.json(JSON.parse(String(init.body)))
      }
      if (init?.method === "DELETE") return new Response(null, { status: 204 })
      if (init?.method === "PATCH") {
        vacancyState = {
          ...vacancyState,
          ...JSON.parse(String(init.body)),
        }
        return Response.json(vacancyState)
      }
      const requestedId = url.match(/feed\/(\d+)/)?.[1]
      if (
        requestedId &&
        !url.includes("feed?") &&
        !url.includes("/note") &&
        !url.includes("/application") &&
        failLoadOnce
      ) {
        failLoadOnce = false
        return Response.json({}, { status: 500 })
      }
      if (requestedId === "43")
        return Response.json({
          ...detail,
          id: 43,
          title: "Інша вакансія",
          note: "",
          has_note: false,
          application: null,
          application_submitted_at: null,
        })
      const currentDetail = storyParameters.vacancyDetail ?? detail
      if (url.includes("feed?"))
        return Response.json({ items: [currentDetail], next_cursor: null })
      return Response.json({
        ...currentDetail,
        note: refreshedNote ?? currentDetail.note,
      })
    }
    return () => {
      useVacancyNotesStore.getState().reset()
      useVacancyApplicationsStore.getState().reset()
      resolvePendingNote = null
      window.fetch = originalFetch
    }
  },
} satisfies Meta<typeof VacancyDetail>

export default meta
type Story = StoryObj<typeof meta>

export const RestoredDesktop: Story = {
  args: { id: 42 },
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      await canvas.findByRole("heading", { name: detail.title }),
    ).toBeVisible()
    await expect(canvas.getByText("Подано")).toBeVisible()
    await expect(canvas.getByLabelText("Компанія")).toHaveTextContent(
      "Northstar Labs",
    )
    await expect(canvas.getByLabelText("Локація")).toHaveTextContent(
      "Remote, Ukraine",
    )
    await expect(canvas.getByLabelText("Дата публікації")).toHaveTextContent(
      "20 серпня 2026 р.",
    )
    await expect(
      canvas.getByRole("button", { name: "Копіювати посилання" }),
    ).toBeVisible()
    await expect(
      canvas.getByRole("link", { name: "Відкрити на DOU" }),
    ).toBeVisible()
    await expect(
      canvas.getByRole("button", { name: "Мої нотатки" }),
    ).toBeVisible()
    const description = canvas.getByRole("region", { name: "Опис вакансії" })
    const productHeading = canvas.getByRole("heading", { name: "Про продукт" })
    const analysis = canvas.getByRole("region", {
      name: "AI-аналіз відповідності",
    })
    const contextActions = canvas.getByRole("group", {
      name: "Дії з деталями вакансії",
    })
    const vacancyHeader = canvas
      .getByRole("heading", { name: detail.title })
      .closest("header")!
    const metadataRow =
      canvas.getByLabelText("Компанія").parentElement!.parentElement!
    const notesAction = canvas.getByRole("button", { name: "Мої нотатки" })
    const sourceAction = canvas.getByRole("link", { name: "Відкрити на DOU" })
    const content = canvas.getByTestId("detail-scroll-region")
    const contentStyle = getComputedStyle(content)
    const disclosure = canvas.getByRole("button", {
      name: "Показати деталі",
    })
    await expect(description).toBeVisible()
    await expect(
      canvas.queryByRole("heading", { name: "Опис вакансії" }),
    ).not.toBeInTheDocument()
    const spacingStep = Number.parseFloat(
      getComputedStyle(document.documentElement).fontSize,
    )
    await expect(parseFloat(contentStyle.paddingTop)).toBe(spacingStep)
    await expect(sourceAction.getBoundingClientRect().left).toBeLessThan(
      notesAction.getBoundingClientRect().left,
    )
    await expect(
      Math.abs(
        notesAction.getBoundingClientRect().right -
          analysis.getBoundingClientRect().right,
      ),
    ).toBeLessThanOrEqual(1)
    await expect(contextActions.getBoundingClientRect().top).toBeLessThan(
      analysis.getBoundingClientRect().top,
    )
    await expect(vacancyHeader).toContainElement(contextActions)
    await expect(metadataRow).toContainElement(contextActions)
    const visibleHeadingInset = spacingStep
    await expect(
      Math.abs(
        analysis.getBoundingClientRect().top -
          productHeading.getBoundingClientRect().top -
          visibleHeadingInset,
      ),
    ).toBeLessThanOrEqual(1)
    await expect(disclosure).toHaveAttribute("aria-expanded", "false")
    await expect(canvas.getByText("Збіги: 3")).toBeVisible()
    await expect(canvas.getByText("Прогалини: 2")).toBeVisible()
    await expect(
      canvas.queryByRole("heading", { name: "Сильні збіги (2)" }),
    ).not.toBeInTheDocument()
    await expect(
      canvas.getByRole("heading", { name: "Що потрібно робити" }),
    ).toBeVisible()
    await expect(canvas.getByRole("table")).toBeVisible()
    await expect(
      canvas.getByRole("link", { name: "сторінці Northstar Labs" }),
    ).toHaveAttribute("target", "_blank")
    await expect(analysis.getBoundingClientRect().left).toBeGreaterThan(
      description.getBoundingClientRect().right,
    )
  },
}

export const ExpandedAnalysis: Story = {
  args: { id: 42 },
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const disclosure = await canvas.findByRole("button", {
      name: "Показати деталі",
    })

    disclosure.focus()
    await userEvent.keyboard("{Enter}")

    await expect(
      canvas.getByRole("button", { name: "Сховати деталі" }),
    ).toHaveAttribute("aria-expanded", "true")
    const compactSummary = canvasElement.querySelector<HTMLElement>(
      '[data-slot="match-compact-summary"]',
    )!
    await expect(compactSummary).toHaveAttribute("aria-hidden", "true")
    await waitFor(() =>
      expect(getComputedStyle(compactSummary).opacity).toBe("0"),
    )
    await expect(
      canvas.getByRole("heading", { name: "Сильні збіги (2)" }),
    ).toBeVisible()
    await expect(
      canvas.getByRole("heading", { name: "Часткові збіги (1)" }),
    ).toBeVisible()
    await expect(
      canvas.getByRole("heading", { name: "Прогалини (2)" }),
    ).toBeVisible()
    await expect(
      canvas.getByRole("heading", { name: "Невідомо (1)" }),
    ).toBeVisible()
    const strongItems = within(
      canvas
        .getByRole("heading", { name: "Сильні збіги (2)" })
        .closest("section")!,
    ).getAllByRole("listitem")
    const gapItems = within(
      canvas
        .getByRole("heading", { name: "Прогалини (2)" })
        .closest("section")!,
    ).getAllByRole("listitem")
    await expect(
      strongItems.every((item) =>
        item.querySelector("svg")?.classList.contains("text-primary"),
      ),
    ).toBe(true)
    await expect(
      gapItems.every((item) =>
        item.querySelector("svg")?.classList.contains("text-destructive"),
      ),
    ).toBe(true)

    const panel = canvasElement.querySelector<HTMLElement>(
      '[data-slot="collapsible-content"]',
    )
    await expect(panel).not.toBeNull()
    await expect(getComputedStyle(panel!).transitionProperty).toContain(
      "height",
    )
    await expect(getComputedStyle(panel!).transitionDuration).not.toBe("0s")
  },
}

export const ActiveActionColors: Story = {
  args: { id: 42 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const save = await canvas.findByRole("button", { name: "Зберегти" })

    await userEvent.click(save)

    const saved = await canvas.findByRole("button", {
      name: "Прибрати зі збережених",
    })
    await expect(saved).toHaveAttribute("aria-pressed", "true")
    await expect(saved).toHaveClass("text-amber-600")
    await expect(saved.querySelector("svg")).toHaveClass("fill-current")

    const hide = canvas.getByRole("button", { name: "Приховати" })
    await userEvent.click(hide)

    const hidden = await canvas.findByRole("button", {
      name: "Повернути вакансію",
    })
    await expect(hidden).toHaveAttribute("aria-pressed", "true")
    await expect(hidden).toHaveClass("text-destructive")
  },
}

export const Mobile: Story = {
  args: { id: 42 },
  globals: { viewport: { value: "mobile", isRotated: false } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(window.innerWidth).toBe(390)
    await expect(await canvas.findByText(detail.title)).toBeVisible()
    await expect(canvas.getByText("Remote, Ukraine")).toBeVisible()
    await expect(canvas.getByText("Аналіз відповідності")).toBeVisible()
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(
      canvasElement.clientWidth,
    )
  },
}

export const NotesAndApplication: Story = {
  render: () => <DetailWithList />,
  args: { id: 42 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      await canvas.findByRole("button", { name: "Мої нотатки" }),
    )
    const sheet = within(document.body).getByRole("dialog")
    await waitFor(() =>
      expect(within(sheet).getByText("Подано 22 серпня 2026 р.")).toBeVisible(),
    )
    await userEvent.click(
      within(sheet).getByRole("button", { name: "Редагувати нотатку" }),
    )
    const note = within(sheet).getByRole("textbox", { name: "Нотатка" })
    await expect(note).toHaveAttribute("maxlength", "4096")
    fireEvent.change(note, {
      target: { value: "Уточнити випробувальний термін." },
    })
    await expect(note).toHaveValue("Уточнити випробувальний термін.")
    await userEvent.click(within(sheet).getByRole("button", { name: "Close" }))
    await waitFor(
      () => {
        const noteRequest = requestLog.mock.calls.find(
          ([input, init]) =>
            String(input).includes("feed/42/note") && init?.method === "PUT",
        )
        expect(noteRequest).toBeDefined()
        expect(JSON.parse(String(noteRequest?.[1]?.body))).toEqual({
          note: "Уточнити випробувальний термін.",
        })
      },
      { timeout: 1_500 },
    )
    await waitFor(() =>
      expect(useVacancyNotesStore.getState().drafts[42]?.status).toBe("saved"),
    )

    await userEvent.click(canvas.getByRole("button", { name: "Мої нотатки" }))
    const reopenedSheet = within(document.body).getByRole("dialog")
    await waitFor(() =>
      expect(
        within(reopenedSheet).getByText("Уточнити випробувальний термін."),
      ).toBeVisible(),
    )
    await userEvent.click(
      within(reopenedSheet).getByRole("button", {
        name: "Редагувати подачу",
      }),
    )
    const coverLetter = within(reopenedSheet).getByRole("textbox", {
      name: "Супровідний текст",
    })
    await userEvent.clear(coverLetter)
    await userEvent.type(coverLetter, "Незбережена чернетка")
    await userEvent.click(
      within(reopenedSheet).getByRole("button", { name: "Скасувати" }),
    )
    await userEvent.click(
      within(reopenedSheet).getByRole("button", {
        name: "Редагувати подачу",
      }),
    )
    await expect(
      within(reopenedSheet).getByRole("textbox", {
        name: "Супровідний текст",
      }),
    ).toHaveValue("Мій супровідний текст.")
    await userEvent.click(
      within(reopenedSheet).getByRole("button", { name: "Редагувати нотатку" }),
    )
    fireEvent.change(
      within(reopenedSheet).getByRole("textbox", { name: "Нотатка" }),
      { target: { value: "" } },
    )
    await waitFor(() =>
      expect(within(reopenedSheet).getByText("Збережено")).toBeVisible(),
    )
    const list = within(
      canvas.getByRole("region", {
        name: "Список для перевірки",
        hidden: true,
      }),
    )
    await expect(
      list.queryByRole("img", { name: "Моя нотатка", hidden: true }),
    ).not.toBeInTheDocument()
  },
}

export const ApplicationLifecycle: Story = {
  render: () => <DetailWithList />,
  args: { id: 42 },
  parameters: {
    vacancyDetail: {
      ...detail,
      application: null,
      application_submitted_at: null,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      await canvas.findByRole("button", { name: "Мої нотатки" }),
    )
    const sheet = within(document.body).getByRole("dialog")
    fireEvent.change(within(sheet).getByLabelText("Дата подачі"), {
      target: { value: "2026-08-24" },
    })
    fireEvent.change(
      within(sheet).getByRole("textbox", { name: "Супровідний текст" }),
      { target: { value: "Початковий супровідний текст." } },
    )
    await userEvent.click(
      within(sheet).getByRole("button", { name: "Зафіксувати подачу" }),
    )
    await waitFor(() =>
      expect(within(sheet).getByText("Подано 24 серпня 2026 р.")).toBeVisible(),
    )
    await expect(
      within(
        canvas.getByRole("region", {
          name: "Список для перевірки",
          hidden: true,
        }),
      ).getByRole("img", { name: "Подано", hidden: true }),
    ).toBeInTheDocument()

    await userEvent.click(
      within(sheet).getByRole("button", { name: "Редагувати подачу" }),
    )
    const coverLetter = within(sheet).getByRole("textbox", {
      name: "Супровідний текст",
    })
    fireEvent.change(coverLetter, {
      target: { value: "Updated cover letter." },
    })
    await expect(coverLetter).toHaveValue("Updated cover letter.")
    await userEvent.click(
      within(sheet).getByRole("button", { name: "Зберегти" }),
    )
    await waitFor(() => {
      const applicationRequests = requestLog.mock.calls.filter(
        ([input, init]) =>
          String(input).includes("feed/42/application") &&
          init?.method === "PUT",
      )
      expect(applicationRequests).toHaveLength(2)
      const updatedApplication = JSON.parse(
        String(applicationRequests[1]?.[1]?.body),
      )
      expect(updatedApplication.submitted_at).toBe("2026-08-24")
      expect(updatedApplication.cover_letter).toBe("Updated cover letter.")
    })

    await userEvent.click(
      await within(sheet).findByRole("button", { name: "Редагувати подачу" }),
    )
    await userEvent.click(
      within(sheet).getByRole("button", { name: "Видалити" }),
    )
    await expect(
      await within(sheet).findByRole("button", {
        name: "Зафіксувати подачу",
      }),
    ).toBeVisible()
    await expect(
      within(
        canvas.getByRole("region", {
          name: "Список для перевірки",
          hidden: true,
        }),
      ).queryByRole("img", { name: "Подано", hidden: true }),
    ).not.toBeInTheDocument()
  },
}

export const NoteReopenWhileSaving: Story = {
  args: { id: 42 },
  parameters: { delayNote: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      await canvas.findByRole("button", { name: "Мої нотатки" }),
    )
    let sheet = within(within(document.body).getByRole("dialog"))
    await userEvent.click(
      sheet.getByRole("button", { name: "Редагувати нотатку" }),
    )
    fireEvent.change(sheet.getByRole("textbox", { name: "Нотатка" }), {
      target: { value: "Перший текст" },
    })
    await waitFor(() => expect(pendingNotes).toHaveLength(1))
    fireEvent.change(sheet.getByRole("textbox", { name: "Нотатка" }), {
      target: { value: "Проміжний текст" },
    })
    await userEvent.click(sheet.getByRole("button", { name: "Close" }))
    await waitFor(() =>
      expect(
        within(document.body).queryByRole("dialog"),
      ).not.toBeInTheDocument(),
    )
    await userEvent.click(canvas.getByRole("button", { name: "Мої нотатки" }))
    sheet = within(within(document.body).getByRole("dialog"))
    await expect(sheet.getByRole("textbox", { name: "Нотатка" })).toHaveValue(
      "Проміжний текст",
    )
    fireEvent.change(sheet.getByRole("textbox", { name: "Нотатка" }), {
      target: { value: "Остаточний текст" },
    })
    pendingNotes[0].resolve(Response.json({ note: pendingNotes[0].note }))
    await waitFor(() => expect(pendingNotes).toHaveLength(2))
    await expect(pendingNotes[1].note).toBe("Остаточний текст")
    pendingNotes[1].resolve(Response.json({ note: pendingNotes[1].note }))
    await waitFor(() => expect(sheet.getByText("Збережено")).toBeVisible())
    await userEvent.click(sheet.getByRole("button", { name: "Close" }))
    await waitFor(() =>
      expect(
        within(document.body).queryByRole("dialog"),
      ).not.toBeInTheDocument(),
    )
    await userEvent.click(canvas.getByRole("button", { name: "Мої нотатки" }))
    await waitFor(() =>
      expect(within(document.body).getByText("Остаточний текст")).toBeVisible(),
    )
  },
}

export const NoteConfirmsEarlierSaveDespiteNewerDraftFailure: Story = {
  render: () => <DetailWithList />,
  args: { id: 42 },
  parameters: { delayNote: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      await canvas.findByRole("button", { name: "Мої нотатки" }),
    )
    const sheet = within(within(document.body).getByRole("dialog"))
    await userEvent.click(
      sheet.getByRole("button", { name: "Редагувати нотатку" }),
    )
    fireEvent.change(sheet.getByRole("textbox", { name: "Нотатка" }), {
      target: { value: "Перший текст" },
    })
    await waitFor(() => expect(pendingNotes).toHaveLength(1))
    fireEvent.change(sheet.getByRole("textbox", { name: "Нотатка" }), {
      target: { value: "Другий текст" },
    })

    pendingNotes[0].resolve(Response.json({ note: pendingNotes[0].note }))
    await waitFor(() => expect(pendingNotes).toHaveLength(2))
    await expect(pendingNotes[1].note).toBe("Другий текст")
    pendingNotes[1].resolve(Response.json({}, { status: 500 }))

    await waitFor(() =>
      expect(useFeedStateStore.getState().overrides[42]?.has_note).toBe(true),
    )
    await expect(useFeedStateStore.getState().overrides[42]?.note).toBe(
      "Перший текст",
    )
    await expect(
      within(
        canvas.getByRole("region", {
          name: "Список для перевірки",
          hidden: true,
        }),
      ).getByRole("img", { name: "Моя нотатка", hidden: true }),
    ).toBeInTheDocument()

    await expect(sheet.getByRole("textbox", { name: "Нотатка" })).toHaveValue(
      "Другий текст",
    )
    await waitFor(() =>
      expect(sheet.getByText("Не вдалося зберегти нотатку")).toBeVisible(),
    )
    await expect(sheet.getByRole("button", { name: "Повторити" })).toBeVisible()
  },
}

export const NoteFailureAfterClose: Story = {
  args: { id: 42 },
  parameters: { failNote: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      await canvas.findByRole("button", { name: "Мої нотатки" }),
    )
    let sheet = within(within(document.body).getByRole("dialog"))
    await userEvent.click(
      sheet.getByRole("button", { name: "Редагувати нотатку" }),
    )
    fireEvent.change(sheet.getByRole("textbox", { name: "Нотатка" }), {
      target: { value: "Збережена локально чернетка" },
    })
    await userEvent.click(sheet.getByRole("button", { name: "Close" }))
    await waitFor(() =>
      expect(
        within(document.body).queryByRole("dialog"),
      ).not.toBeInTheDocument(),
    )
    await userEvent.click(canvas.getByRole("button", { name: "Мої нотатки" }))
    sheet = within(within(document.body).getByRole("dialog"))
    await expect(sheet.getByRole("textbox", { name: "Нотатка" })).toHaveValue(
      "Збережена локально чернетка",
    )
    await waitFor(() =>
      expect(sheet.getByText("Не вдалося зберегти нотатку")).toBeVisible(),
    )
    await userEvent.click(sheet.getByRole("button", { name: "Повторити" }))
    await expect(await sheet.findByText("Збережено")).toBeVisible()
  },
}

export const ResourceErrors: Story = {
  args: { id: 42 },
  parameters: { failNote: true, failApplication: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      await canvas.findByRole("button", { name: "Мої нотатки" }),
    )
    const sheet = within(document.body).getByRole("dialog")
    await userEvent.click(
      within(sheet).getByRole("button", { name: "Редагувати подачу" }),
    )
    await userEvent.click(
      within(sheet).getByRole("button", { name: "Зберегти" }),
    )
    const applicationError = await within(sheet).findByText(
      "Не вдалося зберегти подачу",
    )
    await expect(applicationError).toHaveAttribute("role", "alert")

    await userEvent.click(
      within(sheet).getByRole("button", { name: "Редагувати нотатку" }),
    )
    const note = within(sheet).getByRole("textbox", { name: "Нотатка" })
    fireEvent.change(note, {
      target: { value: "Нотатка, яку не збережено" },
    })
    await expect(
      await within(sheet).findByText("Не вдалося зберегти нотатку"),
    ).toBeVisible()
  },
}

export const StaleNoteResponse: Story = {
  render: () => <VacancyNavigationHarness />,
  args: { id: 42 },
  parameters: { delayNote: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      await canvas.findByRole("button", { name: "Мої нотатки" }),
    )
    const sheet = within(document.body).getByRole("dialog")
    await userEvent.click(
      within(sheet).getByRole("button", { name: "Редагувати нотатку" }),
    )
    const note = within(sheet).getByRole("textbox", { name: "Нотатка" })
    fireEvent.change(note, { target: { value: "Нотатка першої вакансії" } })
    await waitFor(() => expect(resolvePendingNote).not.toBeNull())
    await userEvent.click(within(sheet).getByRole("button", { name: "Close" }))
    await userEvent.click(
      canvas.getByRole("button", { name: "Наступна вакансія" }),
    )
    await expect(
      await canvas.findByRole("heading", { name: "Інша вакансія" }),
    ).toBeVisible()

    resolvePendingNote?.(Response.json({ note: "Нотатка першої вакансії" }))
    await waitFor(() =>
      expect(useVacancyNotesStore.getState().drafts[42]?.status).toBe("saved"),
    )
    await userEvent.click(canvas.getByRole("button", { name: "Мої нотатки" }))
    const nextSheet = within(document.body).getByRole("dialog")
    await expect(
      within(nextSheet).getByRole("textbox", { name: "Нотатка" }),
    ).toHaveValue("")
  },
}

export const RevisitAfterFailureClearsError: Story = {
  render: () => <VacancyNavigationHarness />,
  args: { id: 42 },
  parameters: {
    failLoadOnce: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      await canvas.findByText("Не вдалося завантажити вакансію."),
    ).toBeVisible()

    await userEvent.click(
      canvas.getByRole("button", { name: "Наступна вакансія" }),
    )
    await expect(
      await canvas.findByRole("heading", { name: "Інша вакансія" }),
    ).toBeVisible()

    await userEvent.click(
      canvas.getByRole("button", { name: "Попередня вакансія" }),
    )

    await expect(
      await canvas.findByRole("heading", { name: detail.title }),
    ).toBeVisible()
    await expect(
      canvas.queryByText("Не вдалося завантажити вакансію."),
    ).not.toBeInTheDocument()
  },
}

export const RefreshedServerNote: Story = {
  args: { id: 42 },
  render: () => <VacancyNavigationHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      await canvas.findByRole("button", { name: "Мої нотатки" }),
    )
    const sheet = within(within(document.body).getByRole("dialog"))
    await userEvent.click(
      sheet.getByRole("button", { name: "Редагувати нотатку" }),
    )
    fireEvent.change(sheet.getByRole("textbox", { name: "Нотатка" }), {
      target: { value: "Перший збережений текст" },
    })
    await waitFor(() => expect(sheet.getByText("Збережено")).toBeVisible())
    await userEvent.click(sheet.getByRole("button", { name: "Close" }))
    await waitFor(() =>
      expect(
        within(document.body).queryByRole("dialog"),
      ).not.toBeInTheDocument(),
    )
    refreshedNote = "Новіший текст із сервера"
    await userEvent.click(
      canvas.getByRole("button", { name: "Наступна вакансія" }),
    )
    await canvas.findByRole("heading", { name: "Інша вакансія" })
    await userEvent.click(
      canvas.getByRole("button", { name: "Попередня вакансія" }),
    )
    await canvas.findByRole("heading", { name: detail.title })
    await userEvent.click(canvas.getByRole("button", { name: "Мої нотатки" }))
    await waitFor(() =>
      expect(
        within(document.body).getByText("Новіший текст із сервера"),
      ).toBeVisible(),
    )
  },
}
