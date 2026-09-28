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
    const fetch = window.fetch
    document.cookie = "csrftoken=editing-story; path=/"
    window.fetch = async (input, init) => {
      const url = String(input)
      if (url.endsWith("/api/v1/sources")) return Response.json(sources)
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
        return Response.json({ items: [saved], limit: 10 })
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
