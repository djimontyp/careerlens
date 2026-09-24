import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { expect, fireEvent, waitFor } from "storybook/test"

import type { VacancyDetail } from "@/features/feed/api"
import { VacancyApplication } from "@/features/feed/components/vacancy-application"
import { useVacancyApplicationsStore } from "@/features/feed/state/applications"

const vacancy: VacancyDetail = {
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
  description: "Build reliable services.",
  description_status: "source",
  note: "",
  application: null,
}

let pendingResponse: ((response: Response) => void) | undefined
let writes = 0

function ApplicationRemountHarness() {
  const [visible, setVisible] = useState(true)
  const [current, setCurrent] = useState(vacancy)
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 p-4">
      <button type="button" onClick={() => setVisible((value) => !value)}>
        {visible ? "Закрити редактор" : "Відкрити редактор"}
      </button>
      {visible && (
        <VacancyApplication
          vacancy={current}
          onChange={(application) =>
            setCurrent((value) => ({ ...value, application }))
          }
        />
      )}
    </main>
  )
}

const meta = {
  title: "Feed/Vacancy Application",
  component: ApplicationRemountHarness,
  render: () => <ApplicationRemountHarness />,
  beforeEach: () => {
    const originalFetch = window.fetch
    useVacancyApplicationsStore.getState().reset()
    writes = 0
    pendingResponse = undefined
    window.fetch = async (input, init) => {
      if (
        String(input).endsWith("feed/812/application") &&
        (init?.method === "PUT" || init?.method === "DELETE")
      ) {
        writes += 1
        return new Promise<Response>((resolve) => {
          pendingResponse = resolve
        })
      }
      throw new Error(`Unexpected application story request: ${String(input)}`)
    }
    return () => {
      useVacancyApplicationsStore.getState().reset()
      window.fetch = originalFetch
    }
  },
} satisfies Meta<typeof ApplicationRemountHarness>

export default meta
type Story = StoryObj<typeof meta>

export const PendingWriteSurvivesRemount: Story = {
  play: async ({ canvas, userEvent }) => {
    fireEvent.change(canvas.getByLabelText("Дата подачі"), {
      target: { value: "2026-08-24" },
    })
    fireEvent.change(
      canvas.getByRole("textbox", { name: "Супровідний текст" }),
      { target: { value: "Submitted cover letter" } },
    )
    await userEvent.click(
      canvas.getByRole("button", { name: "Зафіксувати подачу" }),
    )
    await waitFor(() => expect(pendingResponse).toBeDefined())
    await userEvent.click(
      canvas.getByRole("button", { name: "Закрити редактор" }),
    )
    await userEvent.click(
      canvas.getByRole("button", { name: "Відкрити редактор" }),
    )
    const submit = canvas.getByRole("button", { name: "Зафіксувати подачу" })
    await expect(submit).toBeDisabled()
    await expect(
      canvas.getByRole("textbox", { name: "Супровідний текст" }),
    ).toHaveValue("Submitted cover letter")
    fireEvent.submit(submit.closest("form")!)
    await expect(writes).toBe(1)
    pendingResponse?.(
      Response.json({
        submitted_at: "2026-08-24",
        cover_letter: "Submitted cover letter",
      }),
    )
    await expect(
      await canvas.findByText("Подано 24 серпня 2026 р."),
    ).toBeVisible()
    await userEvent.click(
      canvas.getByRole("button", { name: "Редагувати подачу" }),
    )
    await expect(canvas.getByLabelText("Дата подачі")).toHaveValue("2026-08-24")
    await expect(
      canvas.getByRole("textbox", { name: "Супровідний текст" }),
    ).toHaveValue("Submitted cover letter")
    await userEvent.click(canvas.getByRole("button", { name: "Видалити" }))
    await waitFor(() => expect(writes).toBe(2))
    await userEvent.click(
      canvas.getByRole("button", { name: "Закрити редактор" }),
    )
    await userEvent.click(
      canvas.getByRole("button", { name: "Відкрити редактор" }),
    )
    await expect(
      canvas.getByRole("button", { name: "Видалити" }),
    ).toBeDisabled()
    pendingResponse?.(new Response(null, { status: 204 }))
    await expect(
      await canvas.findByRole("button", { name: "Зафіксувати подачу" }),
    ).toBeVisible()
    await expect(canvas.getByLabelText("Дата подачі")).toHaveValue("")
    await expect(
      canvas.getByRole("textbox", { name: "Супровідний текст" }),
    ).toHaveValue("")
  },
}

export const FailedWriteRetainsSubmittedDraft: Story = {
  play: async ({ canvas, userEvent }) => {
    fireEvent.change(canvas.getByLabelText("Дата подачі"), {
      target: { value: "2026-08-24" },
    })
    fireEvent.change(
      canvas.getByRole("textbox", { name: "Супровідний текст" }),
      { target: { value: "Recoverable cover letter" } },
    )
    await userEvent.click(
      canvas.getByRole("button", { name: "Зафіксувати подачу" }),
    )
    await waitFor(() => expect(pendingResponse).toBeDefined())
    await userEvent.click(
      canvas.getByRole("button", { name: "Закрити редактор" }),
    )
    pendingResponse?.(
      Response.json({ detail: "Internal Server Error" }, { status: 500 }),
    )
    await userEvent.click(
      canvas.getByRole("button", { name: "Відкрити редактор" }),
    )
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Не вдалося зберегти подачу",
    )
    await expect(
      canvas.getByRole("textbox", { name: "Супровідний текст" }),
    ).toHaveValue("Recoverable cover letter")
    await userEvent.click(
      canvas.getByRole("button", { name: "Зафіксувати подачу" }),
    )
    await waitFor(() => expect(writes).toBe(2))
    pendingResponse?.(
      Response.json({
        submitted_at: "2026-08-24",
        cover_letter: "Recoverable cover letter",
      }),
    )
    await expect(
      await canvas.findByText("Подано 24 серпня 2026 р."),
    ).toBeVisible()
  },
}

export const DateOutOfRangeRejectionShowsRangeMessage: Story = {
  play: async ({ canvas, userEvent }) => {
    fireEvent.change(canvas.getByLabelText("Дата подачі"), {
      target: { value: "2026-08-24" },
    })
    await userEvent.click(
      canvas.getByRole("button", { name: "Зафіксувати подачу" }),
    )
    await waitFor(() => expect(pendingResponse).toBeDefined())
    pendingResponse?.(
      Response.json(
        {
          detail: [
            {
              type: "value_error",
              loc: ["body", "payload", "submitted_at"],
              msg: "Value error, Submission date cannot be in the future.",
            },
          ],
        },
        { status: 422 },
      ),
    )
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Дата подачі має бути не раніше 01.01.2000 і не пізніше сьогодні",
    )
  },
}
