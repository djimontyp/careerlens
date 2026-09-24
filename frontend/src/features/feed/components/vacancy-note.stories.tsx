import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, waitFor } from "storybook/test"

import type { VacancyDetail } from "@/features/feed/api"
import { VacancyNote } from "@/features/feed/components/vacancy-note"
import { useVacancyNotesStore } from "@/features/feed/state/notes"

const vacancy: VacancyDetail = {
  id: 900,
  title: "Backend Engineer",
  company: "Riverline",
  location: "Remote",
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

const CSRF_TOKEN = "story-note-csrf-token"

let requests: { url: string; init?: RequestInit }[] = []

const meta = {
  title: "Feed/Vacancy Note",
  component: VacancyNote,
  args: { vacancy },
  beforeEach: () => {
    document.cookie = `csrftoken=${CSRF_TOKEN}; path=/`
    const originalFetch = window.fetch
    requests = []
    window.fetch = async (input, init) => {
      const url = String(input)
      requests.push({ url, init })
      if (url.endsWith(`feed/${vacancy.id}/note`) && init?.method === "PUT") {
        return Response.json({
          note: (JSON.parse(String(init.body)) as { note: string }).note,
        })
      }
      throw new Error(`Unexpected note story request: ${url}`)
    }
    return () => {
      window.fetch = originalFetch
      document.cookie =
        "csrftoken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      useVacancyNotesStore.getState().reset()
    }
  },
} satisfies Meta<typeof VacancyNote>

export default meta
type Story = StoryObj<typeof meta>

export const PagehideFlushesPendingNoteBeforeDebounce: Story = {
  play: async ({ canvas, userEvent }) => {
    const textarea = canvas.getByRole("textbox", { name: "Нотатка" })
    await userEvent.type(textarea, "Urgent note")
    await expect(requests).toHaveLength(0)

    window.dispatchEvent(new Event("pagehide"))

    await waitFor(() => expect(requests).toHaveLength(1))
    const [request] = requests
    await expect(request.init?.method).toBe("PUT")
    await expect(request.init?.keepalive).toBe(true)
    await expect(request.init?.credentials).toBe("same-origin")
    await expect(new Headers(request.init?.headers).get("X-CSRFToken")).toBe(
      CSRF_TOKEN,
    )
    await expect(new Headers(request.init?.headers).get("Content-Type")).toBe(
      "application/json",
    )
    await expect(JSON.parse(String(request.init?.body))).toEqual({
      note: "Urgent note",
    })
  },
}

export const BeforeUnloadGuardTracksUnsavedNote: Story = {
  play: async ({ canvas, userEvent }) => {
    const textarea = canvas.getByRole("textbox", { name: "Нотатка" })
    await userEvent.type(textarea, "Guard me")

    const pendingEvent = new Event("beforeunload", { cancelable: true })
    window.dispatchEvent(pendingEvent)
    await expect(pendingEvent.defaultPrevented).toBe(true)

    await waitFor(() => expect(canvas.getByText("Збережено")).toBeVisible())

    const savedEvent = new Event("beforeunload", { cancelable: true })
    window.dispatchEvent(savedEvent)
    await expect(savedEvent.defaultPrevented).toBe(false)
  },
}
