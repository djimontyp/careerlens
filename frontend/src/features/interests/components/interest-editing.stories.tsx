import type { Meta, StoryObj } from "@storybook/react-vite"
import { MemoryRouter } from "react-router-dom"
import { expect, screen, waitFor, within } from "storybook/test"

import type { Interest, InterestPatch } from "@/features/interests/api"
import { InterestsPage } from "@/features/interests/components/interests-page"

const original: Interest = {
  id: 1,
  name: "Python Backend",
  keywords: ["python", "django"],
  stop_words: ["senior"],
  sources: [{ code: "dou", name: "DOU", icon_url: "/source-icons/dou.png" }],
  is_active: true,
  created_at: "2026-09-24T10:00:00Z",
}
const sources = [
  ...original.sources,
  { code: "djinni", name: "Djinni", icon_url: "/source-icons/djinni.png" },
]
let saved: Interest
let patches: InterestPatch[]
let responseStatus: number
let holdSave: boolean
let holdReload: boolean
let failReload: boolean
let finishSave: (() => void) | undefined
let finishReload: (() => void) | undefined
let sourceRequests: number
let gone: boolean
let listLimit: number
let createConflict: boolean

const meta = {
  title: "Interests/Editing",
  component: InterestsPage,
  parameters: { layout: "fullscreen" },
  beforeEach: () => {
    saved = structuredClone(original)
    patches = []
    responseStatus = 200
    holdSave = false
    holdReload = false
    failReload = false
    finishSave = undefined
    finishReload = undefined
    sourceRequests = 0
    gone = false
    listLimit = 10
    createConflict = false
    const fetch = window.fetch
    document.cookie = "csrftoken=editing-story; path=/"
    window.fetch = async (input, init) => {
      const url = String(input)
      if (url.endsWith("/api/v1/sources")) {
        sourceRequests++
        return Response.json(sources)
      }
      if (url.endsWith("/api/v1/interests/1") && init?.method === "DELETE") {
        if (gone) return Response.json({ detail: "Not Found" }, { status: 404 })
        gone = true
        return new Response(null, { status: 204 })
      }
      if (url.endsWith("/api/v1/interests") && init?.method === "POST") {
        if (createConflict) {
          listLimit = 1
          return Response.json(
            { detail: "Interest limit reached." },
            { status: 409 },
          )
        }
        return new Response(null, { status: 404 })
      }
      if (url.endsWith("/api/v1/interests/1") && init?.method === "PATCH") {
        const patch: InterestPatch = JSON.parse(String(init.body))
        patches.push(patch)
        expect(new Headers(init.headers).get("X-CSRFToken")).toBe(
          "editing-story",
        )
        if (holdSave)
          await new Promise<void>((resolve) => {
            finishSave = resolve
          })
        if (gone) return Response.json({ detail: "Not Found" }, { status: 404 })
        const stopWords = (patch.stop_words ?? saved.stop_words).map((word) =>
          word.toLowerCase(),
        )
        const overlap = (patch.keywords ?? saved.keywords).filter((word) =>
          stopWords.includes(word.toLowerCase()),
        )
        if (overlap.length)
          return Response.json(
            {
              detail: [
                {
                  loc: ["body", "payload", "stop_words"],
                  msg: `Value error, Keywords and stop words overlap: ${overlap.join(", ")}`,
                  type: "value_error",
                },
              ],
            },
            { status: 422 },
          )
        if (responseStatus === 422)
          return Response.json(
            {
              detail: [
                {
                  loc: ["body", "payload", "keywords"],
                  msg: "Invalid keyword",
                  type: "value_error",
                },
              ],
            },
            { status: 422 },
          )
        if (responseStatus !== 200)
          return new Response(null, { status: responseStatus })
        saved = {
          ...saved,
          ...patch,
          sources: patch.sources
            ? sources.filter((source) => patch.sources!.includes(source.code))
            : saved.sources,
        }
        return Response.json(saved)
      }
      if (url.endsWith("/api/v1/interests")) {
        if (patches.length && holdReload)
          await new Promise<void>((resolve) => {
            finishReload = resolve
          })
        if (patches.length && failReload)
          return new Response(null, { status: 500 })
        return Response.json({ items: gone ? [] : [saved], limit: listLimit })
      }
      return new Response(null, { status: 404 })
    }
    return () => {
      finishSave?.()
      finishReload?.()
      window.fetch = fetch
      document.cookie =
        "csrftoken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    }
  },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div className="h-svh bg-background">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof InterestsPage>
export default meta
type Story = StoryObj<typeof meta>

const openEditor: Story["play"] = async ({ canvas, userEvent }) => {
  await userEvent.click(
    await canvas.findByRole("button", { name: "Дії: Python Backend" }),
  )
  await userEvent.click(
    await screen.findByRole("menuitem", { name: "Редагувати" }),
  )
  const dialog = await screen.findByRole("dialog", {
    name: "Редагувати інтерес",
  })
  await within(dialog).findByRole("checkbox", { name: "DOU" })
}

export const CancelAndReopen: Story = {
  play: async (context) => {
    await openEditor(context)
    const { canvas, userEvent } = context
    const dialog = within(screen.getByRole("dialog"))
    await userEvent.clear(dialog.getByLabelText("Назва"))
    await userEvent.type(dialog.getByLabelText("Назва"), "Незбережена назва")
    await userEvent.click(dialog.getByRole("checkbox", { name: "Djinni" }))
    await userEvent.click(dialog.getByRole("button", { name: "Скасувати" }))
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    )
    await expect(
      canvas.getByRole("button", { name: "Дії: Python Backend" }),
    ).toHaveFocus()
    expect(patches).toHaveLength(0)
    await openEditor(context)
    const reopened = within(screen.getByRole("dialog"))
    await expect(reopened.getByLabelText("Назва")).toHaveValue(original.name)
    await expect(
      reopened.getByRole("checkbox", { name: "Djinni" }),
    ).not.toBeChecked()
    await expect(reopened.getByRole("checkbox", { name: "DOU" })).toBeChecked()
  },
}

export const PendingSaveAndReload: Story = {
  play: async (context) => {
    holdSave = true
    holdReload = true
    await openEditor(context)
    const { canvas, userEvent } = context
    const popup = screen.getByRole("dialog")
    const form = within(popup)
    const name = form.getByLabelText("Назва")
    await userEvent.clear(name)
    await userEvent.type(name, "Backend updated")
    await userEvent.click(form.getByRole("button", { name: "Зберегти" }))
    try {
      await waitFor(() => expect(finishSave).toBeDefined())
      await expect(popup.querySelector("form")!).toHaveAttribute(
        "aria-busy",
        "true",
      )
      for (const input of form.getAllByRole("textbox"))
        await expect(input).toBeDisabled()
      for (const input of form.getAllByRole("checkbox"))
        await expect(input).toHaveAttribute("aria-disabled", "true")
      await expect(
        form.getByRole("button", { name: "Скасувати" }),
      ).toBeDisabled()
      await userEvent.keyboard("{Enter}{Escape}")
      await expect(popup).toBeVisible()
      await userEvent.click(canvas.getByText("1 із 10 інтересів"))
      await expect(popup).toBeVisible()
      expect(patches).toEqual([{ name: "Backend updated" }])
      finishSave?.()
      await waitFor(() => expect(finishReload).toBeDefined())
      await expect(popup.querySelector("form")!).toHaveAttribute(
        "aria-busy",
        "true",
      )
      await expect(
        form.getByRole("button", { name: "Зберегти" }),
      ).toBeDisabled()
      finishReload?.()
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      )
      await expect(
        canvas.getByRole("heading", { name: "Backend updated" }),
      ).toBeVisible()
      await waitFor(() =>
        expect(
          canvas.getByRole("button", { name: "Дії: Backend updated" }),
        ).toHaveFocus(),
      )
    } finally {
      finishSave?.()
      finishReload?.()
    }
  },
}

export const FailurePreservesDraftAndRetry: Story = {
  play: async (context) => {
    responseStatus = 500
    await openEditor(context)
    const { canvas, userEvent } = context
    const form = within(screen.getByRole("dialog"))
    await userEvent.clear(form.getByLabelText("Назва"))
    await userEvent.type(form.getByLabelText("Назва"), "Backend updated")
    await userEvent.clear(form.getByLabelText("Ключові слова"))
    await userEvent.type(
      form.getByLabelText("Ключові слова"),
      "python, fastapi",
    )
    await userEvent.clear(form.getByLabelText("Стоп-слова"))
    await userEvent.click(form.getByRole("checkbox", { name: "DOU" }))
    await userEvent.click(form.getByRole("checkbox", { name: "Djinni" }))
    await userEvent.click(form.getByRole("button", { name: "Зберегти" }))
    await expect(await form.findByRole("alert")).toHaveTextContent(
      "Не вдалося зберегти інтерес.",
    )
    await expect(form.getByLabelText("Назва")).toHaveValue("Backend updated")
    await expect(form.getByLabelText("Ключові слова")).toHaveValue(
      "python, fastapi",
    )
    await expect(form.getByLabelText("Стоп-слова")).toHaveValue("")
    await expect(form.getByRole("checkbox", { name: "Djinni" })).toBeChecked()
    await expect(form.getByRole("checkbox", { name: "DOU" })).not.toBeChecked()
    await expect(form.getByRole("button", { name: "Зберегти" })).toBeEnabled()
    expect(saved).toEqual(original)
    responseStatus = 200
    await userEvent.click(form.getByRole("button", { name: "Зберегти" }))
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    )
    expect(patches).toEqual(
      Array(2).fill({
        name: "Backend updated",
        keywords: ["python", "fastapi"],
        stop_words: [],
        sources: ["djinni"],
      }),
    )
    const card = within(
      canvas.getByRole("heading", { name: "Backend updated" }).closest("li")!,
    )
    await expect(card.getByText("fastapi")).toBeVisible()
    await expect(card.getByText("Djinni")).toBeVisible()
    expect(card.queryByText(/^Не включати:/)).not.toBeInTheDocument()
    await userEvent.click(
      card.getByRole("button", { name: "Дії: Backend updated" }),
    )
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Редагувати" }),
    )
    const reopened = within(await screen.findByRole("dialog"))
    await expect(reopened.getByLabelText("Ключові слова")).toHaveValue(
      "python, fastapi",
    )
    await expect(
      await reopened.findByRole("checkbox", { name: "Djinni" }),
    ).toBeChecked()
  },
}

export const ValidationFailureAndCorrection: Story = {
  play: async (context) => {
    responseStatus = 422
    await openEditor(context)
    const { userEvent } = context
    const form = within(screen.getByRole("dialog"))
    const keywords = form.getByLabelText("Ключові слова")
    await userEvent.clear(keywords)
    await userEvent.type(keywords, "python, rejected")
    await userEvent.click(form.getByRole("button", { name: "Зберегти" }))
    await waitFor(() =>
      expect(keywords).toHaveAttribute("aria-invalid", "true"),
    )
    await expect(keywords).toHaveAccessibleDescription(/Перевірте це поле/)
    await expect(keywords).toHaveValue("python, rejected")
    responseStatus = 200
    await userEvent.clear(keywords)
    await userEvent.type(keywords, "python, fastapi")
    await userEvent.click(form.getByRole("button", { name: "Зберегти" }))
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    )
    expect(saved.keywords).toEqual(["python", "fastapi"])
  },
}

export const SavedButReloadFailed: Story = {
  play: async (context) => {
    failReload = true
    await openEditor(context)
    const { canvas, userEvent } = context
    const form = within(screen.getByRole("dialog"))
    await userEvent.clear(form.getByLabelText("Назва"))
    await userEvent.type(form.getByLabelText("Назва"), "Backend updated")
    await userEvent.click(form.getByRole("button", { name: "Зберегти" }))
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    )
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Не вдалося завантажити інтереси.",
    )
    expect(saved.name).toBe("Backend updated")
    failReload = false
    await userEvent.click(canvas.getByRole("button", { name: "Повторити" }))
    await expect(
      await canvas.findByRole("heading", { name: "Backend updated" }),
    ).toBeVisible()
    expect(patches).toHaveLength(1)
  },
}

const renameInterest: Story["play"] = async ({ userEvent }) => {
  const form = within(screen.getByRole("dialog"))
  await userEvent.clear(form.getByLabelText("Назва"))
  await userEvent.type(form.getByLabelText("Назва"), "Backend updated")
}

const saveRenamed: Story["play"] = async (context) => {
  await renameInterest(context)
  await context.userEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Зберегти",
    }),
  )
}

export const ClosingDialogKeepsInterestAndSkipsSources: Story = {
  play: async (context) => {
    await openEditor(context)
    expect(sourceRequests).toBe(1)
    await renameInterest(context)
    const seen: {
      title: string | null | undefined
      name: string | undefined
    }[] = []
    const observer = new MutationObserver(() => {
      const dialog = document.querySelector('[data-slot="dialog-content"]')
      if (!dialog) return
      seen.push({
        title: dialog.querySelector('[data-slot="dialog-title"]')?.textContent,
        name: dialog.querySelector("input")?.value,
      })
    })
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    })
    try {
      await context.userEvent.click(
        within(screen.getByRole("dialog")).getByRole("button", {
          name: "Зберегти",
        }),
      )
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      )
    } finally {
      observer.disconnect()
    }
    expect(seen.length).toBeGreaterThan(0)
    for (const snapshot of seen) {
      expect(snapshot.title).toBe("Редагувати інтерес")
      expect(["Python Backend", "Backend updated"]).toContain(snapshot.name)
    }
    expect(sourceRequests).toBe(1)
  },
}

export const CancelledCreateDraftDoesNotLeakIntoFastReopen: Story = {
  play: async ({ canvas, userEvent }) => {
    const create = await canvas.findByRole("button", {
      name: "Створити інтерес",
    })
    await waitFor(() => expect(create).toBeEnabled())
    await userEvent.click(create)
    const first = within(
      await screen.findByRole("dialog", { name: "Новий інтерес" }),
    )
    await userEvent.type(first.getByLabelText("Назва"), "Чернетка")
    await userEvent.type(first.getByLabelText("Ключові слова"), "rust")
    await userEvent.click(first.getByRole("button", { name: "Скасувати" }))
    await userEvent.click(create)
    const reopened = within(
      await screen.findByRole("dialog", { name: "Новий інтерес" }),
    )
    await expect(reopened.getByLabelText("Назва")).toHaveValue("")
    await expect(reopened.getByLabelText("Ключові слова")).toHaveValue("")
  },
}

export const FailedSaveKeepsFocusInsideDialog: Story = {
  play: async (context) => {
    responseStatus = 500
    await openEditor(context)
    const dialog = screen.getByRole("dialog")
    await saveRenamed(context)
    const alert = await within(dialog).findByRole("alert")
    await waitFor(() => expect(alert).toHaveFocus())
    expect(dialog.contains(document.activeElement)).toBe(true)
    await expect(
      within(dialog).getByRole("button", { name: "Зберегти" }),
    ).toBeEnabled()
  },
}

function fieldRegion(dialog: HTMLElement) {
  return within(dialog).getByRole("region", { name: "Поля інтересу" })
}

function expectFullyVisibleIn(element: HTMLElement, region: HTMLElement) {
  const box = element.getBoundingClientRect()
  const bounds = region.getBoundingClientRect()
  expect(box.top).toBeGreaterThanOrEqual(bounds.top - 1)
  expect(box.bottom).toBeLessThanOrEqual(bounds.bottom + 1)
}

export const ServerErrorScrollsIntoView: Story = {
  globals: { viewport: { value: "aboveHeightBoundary", isRotated: false } },
  play: async (context) => {
    expect(window.innerHeight).toBe(481)
    responseStatus = 500
    await openEditor(context)
    const dialog = screen.getByRole("dialog")
    const region = fieldRegion(dialog)
    expect(region.scrollHeight).toBeGreaterThan(region.clientHeight)
    await saveRenamed(context)
    const alert = await within(dialog).findByRole("alert")
    await waitFor(() => expect(alert).toHaveFocus())
    await waitFor(() => expectFullyVisibleIn(alert, region))
    expect(region.scrollTop).toBeGreaterThan(0)
  },
}

export const ClientErrorFocusesFirstInvalidField: Story = {
  globals: { viewport: { value: "aboveHeightBoundary", isRotated: false } },
  play: async (context) => {
    await openEditor(context)
    const { userEvent } = context
    const dialog = screen.getByRole("dialog")
    const region = fieldRegion(dialog)
    const form = within(dialog)
    await userEvent.clear(form.getByLabelText("Стоп-слова"))
    await userEvent.type(form.getByLabelText("Стоп-слова"), "python")
    region.scrollTop = 0
    await userEvent.click(form.getByRole("button", { name: "Зберегти" }))
    const stopWords = form.getByLabelText("Стоп-слова")
    await waitFor(() => expect(stopWords).toHaveFocus())
    await waitFor(() => expectFullyVisibleIn(stopWords, region))
    await expect(stopWords).toHaveAccessibleDescription(
      /Слово не може бути водночас ключовим і стоп-словом: python/,
    )
    expect(patches).toHaveLength(0)
  },
}

export const ReducedMotionScrollsWithoutSmoothing: Story = {
  globals: { viewport: { value: "aboveHeightBoundary", isRotated: false } },
  play: async (context) => {
    const behaviors: (ScrollBehavior | undefined)[] = []
    const scrollIntoView = Element.prototype.scrollIntoView
    const matchMedia = window.matchMedia
    Element.prototype.scrollIntoView = function (
      arg?: boolean | ScrollIntoViewOptions,
    ) {
      behaviors.push(typeof arg === "object" ? arg.behavior : undefined)
      return scrollIntoView.call(this, arg as ScrollIntoViewOptions)
    }
    window.matchMedia = (query: string) =>
      query.includes("prefers-reduced-motion")
        ? ({
            ...matchMedia.call(window, query),
            matches: true,
          } as MediaQueryList)
        : matchMedia.call(window, query)
    try {
      responseStatus = 500
      await openEditor(context)
      await saveRenamed(context)
      await within(screen.getByRole("dialog")).findByRole("alert")
      await waitFor(() => expect(behaviors).toContain("auto"))
      expect(behaviors).not.toContain("smooth")
    } finally {
      Element.prototype.scrollIntoView = scrollIntoView
      window.matchMedia = matchMedia
    }
  },
}

export const StaleSnapshotOverlapRefreshesForm: Story = {
  play: async (context) => {
    await openEditor(context)
    const { canvas, userEvent } = context
    const form = within(screen.getByRole("dialog"))
    await expect(form.getByLabelText("Стоп-слова")).toHaveValue("senior")
    saved = { ...saved, stop_words: ["golang"] }
    const keywords = form.getByLabelText("Ключові слова")
    await userEvent.clear(keywords)
    await userEvent.type(keywords, "python, django, golang")
    await userEvent.click(form.getByRole("button", { name: "Зберегти" }))
    const stopWords = form.getByLabelText("Стоп-слова")
    await waitFor(() => expect(stopWords).toHaveValue("golang"))
    await waitFor(() => expect(stopWords).toHaveFocus())
    await expect(stopWords).toHaveAccessibleDescription(
      /Слово не може бути водночас ключовим і стоп-словом: golang/,
    )
    await expect(keywords).toHaveValue("python, django, golang")
    expect(patches).toEqual([{ keywords: ["python", "django", "golang"] }])
    await userEvent.clear(stopWords)
    await userEvent.click(form.getByRole("button", { name: "Зберегти" }))
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    )
    expect(patches[1]).toEqual({
      keywords: ["python", "django", "golang"],
      stop_words: [],
    })
    expect(saved.stop_words).toEqual([])
    await expect(await canvas.findByText("golang")).toBeVisible()
  },
}

export const EditNotFoundResyncsList: Story = {
  play: async (context) => {
    await openEditor(context)
    const { canvas } = context
    const dialog = screen.getByRole("dialog")
    gone = true
    await saveRenamed(context)
    const alert = await within(dialog).findByRole("alert")
    await expect(alert).toHaveTextContent("Інтерес більше не існує")
    await waitFor(() =>
      expect(
        canvas.queryByRole("heading", { name: "Python Backend" }),
      ).not.toBeInTheDocument(),
    )
    const close = within(dialog).getByRole("button", { name: "Закрити" })
    await waitFor(() => expect(close).toHaveFocus())
    await expect(
      within(dialog).getByRole("button", { name: "Зберегти" }),
    ).toBeDisabled()
    expect(patches).toHaveLength(1)
  },
}

export const ToggleNotFoundResyncsList: Story = {
  play: async ({ canvas, userEvent }) => {
    gone = true
    await userEvent.click(
      await canvas.findByRole("button", {
        name: "Призупинити: Python Backend",
      }),
    )
    const notice = await canvas.findByRole("alert")
    await expect(notice).toHaveTextContent("Інтерес більше не існує")
    await waitFor(() =>
      expect(
        canvas.queryByRole("heading", { name: "Python Backend" }),
      ).not.toBeInTheDocument(),
    )
    await expect(notice).toHaveFocus()
    await expect(
      await canvas.findByText("Ще немає жодного інтересу"),
    ).toBeVisible()
  },
}

export const DeleteNotFoundResyncsList: Story = {
  play: async ({ canvas, userEvent }) => {
    gone = true
    await userEvent.click(
      await canvas.findByRole("button", { name: "Дії: Python Backend" }),
    )
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Видалити" }),
    )
    const dialog = await screen.findByRole("alertdialog")
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Видалити" }),
    )
    const alert = await within(dialog).findByRole("alert")
    await expect(alert).toHaveTextContent("Інтерес уже видалено")
    await waitFor(() =>
      expect(
        canvas.queryByRole("heading", { name: "Python Backend" }),
      ).not.toBeInTheDocument(),
    )
    const close = within(dialog).getByRole("button", { name: "Закрити" })
    await waitFor(() => expect(close).toHaveFocus())
    await expect(
      within(dialog).getByRole("button", { name: "Видалити" }),
    ).toBeDisabled()
  },
}

export const DeleteFailedKeepsFocusInsideDialog: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole("button", { name: "Дії: Python Backend" }),
    )
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Видалити" }),
    )
    const dialog = await screen.findByRole("alertdialog")
    const fetch = window.fetch
    window.fetch = async (input, init) =>
      init?.method === "DELETE"
        ? new Response(null, { status: 500 })
        : fetch(input, init)
    try {
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Видалити" }),
      )
      await within(dialog).findByRole("alert")
      const confirm = within(dialog).getByRole("button", { name: "Видалити" })
      await waitFor(() => expect(confirm).toHaveFocus())
      expect(dialog.contains(document.activeElement)).toBe(true)
    } finally {
      window.fetch = fetch
    }
  },
}

export const CreateLimitConflictResyncsList: Story = {
  play: async ({ canvas, userEvent }) => {
    createConflict = true
    const create = await canvas.findByRole("button", {
      name: "Створити інтерес",
    })
    await waitFor(() => expect(create).toBeEnabled())
    await userEvent.click(create)
    const form = within(
      await screen.findByRole("dialog", { name: "Новий інтерес" }),
    )
    await userEvent.type(form.getByLabelText("Ключові слова"), "rust")
    await userEvent.click(form.getByRole("button", { name: "Створити" }))
    await expect(await form.findByRole("alert")).toHaveTextContent(
      "Досягнуто ліміт інтересів.",
    )
    await expect(await canvas.findByText("1 із 1 інтересів")).toBeVisible()
    await waitFor(() => expect(create).toBeDisabled())
  },
}

export const PauseFailedThenRetry: Story = {
  play: async ({ canvas, userEvent }) => {
    responseStatus = 500
    const pause = await canvas.findByRole("button", {
      name: "Призупинити: Python Backend",
    })
    await userEvent.click(pause)
    const card = within(
      canvas.getByRole("heading", { name: "Python Backend" }).closest("li")!,
    )
    await expect(await card.findByRole("alert")).toHaveTextContent(
      "Не вдалося оновити інтерес.",
    )
    await waitFor(() => expect(pause).toHaveFocus())
    responseStatus = 200
    await userEvent.click(pause)
    await expect(
      await canvas.findByRole("button", { name: "Відновити: Python Backend" }),
    ).toHaveFocus()
    await expect(card.getByText("На паузі")).toBeVisible()
    expect(card.queryByRole("alert")).not.toBeInTheDocument()
    expect(patches).toEqual([{ is_active: false }, { is_active: false }])
  },
}

export const PauseEnterWhilePendingDoesNotDuplicate: Story = {
  play: async ({ canvas, userEvent }) => {
    holdSave = true
    const pause = await canvas.findByRole("button", {
      name: "Призупинити: Python Backend",
    })
    pause.focus()
    try {
      await userEvent.keyboard("{Enter}")
      await waitFor(() => expect(finishSave).toBeDefined())
      await userEvent.keyboard("{Enter}{Enter} ")
      expect(patches).toEqual([{ is_active: false }])
      finishSave?.()
      await expect(
        await canvas.findByRole("button", {
          name: "Відновити: Python Backend",
        }),
      ).toBeEnabled()
      expect(patches).toEqual([{ is_active: false }])
    } finally {
      finishSave?.()
    }
  },
}
