import type { Meta, StoryObj } from "@storybook/react-vite"
import { MemoryRouter } from "react-router-dom"
import { expect, waitFor, within } from "storybook/test"

import App from "@/App"
import { useVacancyNotesStore } from "@/features/feed/state/notes"
import type { InterestsResponse } from "@/features/interests/api"

const DEFAULT_INTEREST: InterestsResponse = {
  items: [
    {
      id: 1,
      name: "Python",
      keywords: ["python"],
      stop_words: [],
      sources: [],
      is_active: true,
      created_at: "2026-09-24T10:00:00Z",
    },
  ],
  limit: 10,
}

const meta = {
  title: "App/Authentication",
  component: App,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story, context) => (
      <MemoryRouter initialEntries={context.parameters.initialEntries ?? ["/"]}>
        <Story />
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof App>

export default meta
type Story = StoryObj<typeof meta>

export const SignedOut: Story = {
  beforeEach: () => {
    const fetch = window.fetch
    window.fetch = async () =>
      new Response(JSON.stringify({ detail: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })

    return () => {
      window.fetch = fetch
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      await canvas.findByRole("button", { name: "Увійти в акаунт" }),
    ).toHaveAttribute("href", "/login/")
  },
}

export const SessionError: Story = {
  beforeEach: () => {
    const fetch = window.fetch
    window.fetch = async () => new Response(null, { status: 500 })

    return () => {
      window.fetch = fetch
    }
  },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByRole("alert"),
    ).toHaveTextContent("Не вдалося перевірити сесію.")
  },
}

export const RetryAfterError: Story = {
  tags: ["!dev"],
  beforeEach: () => {
    const fetch = window.fetch
    let attempt = 0
    window.fetch = async (input) => {
      const url = String(input)
      if (url.includes("/api/v1/interests")) {
        return Response.json(DEFAULT_INTEREST)
      }
      if (!url.endsWith("/me")) {
        return Response.json({ items: [], next_cursor: null })
      }
      attempt += 1
      if (attempt === 1) return new Response(null, { status: 500 })
      return Response.json({
        id: 1,
        email: "ada@example.com",
        first_name: "Ada",
        last_name: "Lovelace",
        avatar_url: null,
      })
    }

    return () => {
      window.fetch = fetch
    }
  },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Не вдалося перевірити сесію.",
    )

    await userEvent.click(canvas.getByRole("button", { name: "Повторити" }))

    await expect(
      await canvas.findByRole("button", { name: "Профіль Ada Lovelace" }),
    ).toBeVisible()
  },
}

export const SignedIn: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
  beforeEach: () => {
    const fetch = window.fetch
    window.fetch = async (input) => {
      const url = String(input)
      if (url.endsWith("/me")) {
        return Response.json({
          id: 1,
          email: "ada@example.com",
          first_name: "Ada",
          last_name: "Lovelace",
          avatar_url: null,
        })
      }
      if (url.includes("/api/v1/interests")) {
        return Response.json(DEFAULT_INTEREST)
      }
      return Response.json({ items: [], next_cursor: null })
    }

    return () => {
      window.fetch = fetch
    }
  },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    const profile = await canvas.findByRole("button", {
      name: "Профіль Ada Lovelace",
    })

    await expect(canvas.getByRole("main")).toBeVisible()
    await waitFor(() =>
      expect(canvas.getByRole("link", { name: "Стрічка" })).toHaveAttribute(
        "aria-current",
        "page",
      ),
    )
    const monocle = canvas
      .getByRole("banner", { name: "Верхня навігація" })
      .querySelector('svg[data-icon="monocle"]')
    await expect(monocle).toBeInTheDocument()
    await expect(monocle).toBeVisible()
    await userEvent.click(profile)
    await waitFor(() =>
      expect(profile).toHaveAttribute("aria-expanded", "true"),
    )
    await userEvent.click(profile)
    await waitFor(() =>
      expect(profile).toHaveAttribute("aria-expanded", "false"),
    )
    await waitFor(() =>
      expect(
        canvasElement.ownerDocument.querySelectorAll(
          "[data-base-ui-focus-guard]",
        ),
      ).toHaveLength(0),
    )
  },
}

let noteFlushResolve: ((response: Response) => void) | undefined
let logoutRequested = false

// The real `/logout` request is left pending on purpose: this story only
// proves the request ordering (note flush resolves before logout is
// requested) without letting `App` reach `window.location.reload()`, which
// cannot be safely stubbed on `window.location` in a real browser.
export const LogoutAwaitsPendingNoteFlush: Story = {
  tags: ["!dev"],
  beforeEach: () => {
    const fetch = window.fetch
    noteFlushResolve = undefined
    logoutRequested = false
    window.fetch = async (input, init) => {
      const url = String(input)
      if (url.endsWith("/me")) {
        return Response.json({
          id: 1,
          email: "ada@example.com",
          first_name: "Ada",
          last_name: "Lovelace",
          avatar_url: null,
        })
      }
      if (url.includes("/api/v1/interests")) {
        return Response.json(DEFAULT_INTEREST)
      }
      if (url.includes("/feed") && !url.endsWith("/note")) {
        return Response.json({ items: [], next_cursor: null })
      }
      if (url.endsWith("feed/501/note") && init?.method === "PUT") {
        return new Promise<Response>((resolve) => {
          noteFlushResolve = resolve
        })
      }
      if (url.endsWith("/logout") && init?.method === "POST") {
        logoutRequested = true
        return new Promise<Response>(() => {
          // Never resolves: keeps App from reaching window.location.reload().
        })
      }
      throw new Error(`Unexpected logout story request: ${url}`)
    }
    useVacancyNotesStore.getState().reset()
    useVacancyNotesStore.getState().change(501, "Unsent before logout")

    return () => {
      window.fetch = fetch
      useVacancyNotesStore.getState().reset()
    }
  },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    const profile = await canvas.findByRole("button", {
      name: "Профіль Ada Lovelace",
    })
    await userEvent.click(profile)
    let popup: HTMLElement | null = null
    await waitFor(() => {
      popup = document.getElementById(
        profile.getAttribute("aria-controls") ?? "",
      )
      expect(popup).toBeVisible()
    })
    const logoutItem = within(popup!).getByRole("menuitem", { name: "Вийти" })
    await userEvent.click(logoutItem)
    await waitFor(() => expect(document.getElementById(popup!.id)).toBeNull())

    await waitFor(() => expect(noteFlushResolve).toBeDefined())
    await expect(logoutRequested).toBe(false)

    noteFlushResolve?.(Response.json({ note: "Unsent before logout" }))

    await waitFor(() => expect(logoutRequested).toBe(true))
  },
}

let resolveFirstPut: ((response: Response) => void) | undefined
let resolveSecondPut: ((response: Response) => void) | undefined
let inFlightRequestOrder: string[] = []
let inFlightLogoutRequested = false

// Unlike LogoutAwaitsPendingNoteFlush (which covers a save still waiting on
// the debounce), this covers a save already in flight when logout is
// clicked, with a newer revision typed behind it: logout must wait for the
// whole flush chain, including the re-flush of that newer revision, not
// just the debounce.
export const LogoutAwaitsInFlightNoteSave: Story = {
  tags: ["!dev"],
  beforeEach: () => {
    const fetch = window.fetch
    resolveFirstPut = undefined
    resolveSecondPut = undefined
    inFlightRequestOrder = []
    inFlightLogoutRequested = false
    let putCount = 0
    window.fetch = async (input, init) => {
      const url = String(input)
      if (url.endsWith("/me")) {
        return Response.json({
          id: 1,
          email: "ada@example.com",
          first_name: "Ada",
          last_name: "Lovelace",
          avatar_url: null,
        })
      }
      if (url.includes("/api/v1/interests")) {
        return Response.json(DEFAULT_INTEREST)
      }
      if (url.includes("/feed") && !url.endsWith("/note")) {
        return Response.json({ items: [], next_cursor: null })
      }
      if (url.endsWith("feed/501/note") && init?.method === "PUT") {
        const body = JSON.parse(String(init.body)) as { note: string }
        putCount += 1
        inFlightRequestOrder.push(`PUT:${body.note}`)
        return new Promise<Response>((resolve) => {
          if (putCount === 1) resolveFirstPut = resolve
          else resolveSecondPut = resolve
        })
      }
      if (url.endsWith("/logout") && init?.method === "POST") {
        inFlightLogoutRequested = true
        inFlightRequestOrder.push("POST:/logout")
        return new Promise<Response>(() => {
          // Never resolves: keeps App from reaching window.location.reload().
        })
      }
      throw new Error(`Unexpected logout story request: ${url}`)
    }
    useVacancyNotesStore.getState().reset()
    useVacancyNotesStore.getState().change(501, "first")
    void useVacancyNotesStore.getState().flush(501)

    return () => {
      window.fetch = fetch
      useVacancyNotesStore.getState().reset()
    }
  },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    await waitFor(() => expect(resolveFirstPut).toBeDefined())

    useVacancyNotesStore.getState().change(501, "first second")

    const profile = await canvas.findByRole("button", {
      name: "Профіль Ada Lovelace",
    })
    await userEvent.click(profile)
    let popup: HTMLElement | null = null
    await waitFor(() => {
      popup = document.getElementById(
        profile.getAttribute("aria-controls") ?? "",
      )
      expect(popup).toBeVisible()
    })
    const logoutItem = within(popup!).getByRole("menuitem", { name: "Вийти" })
    await userEvent.click(logoutItem)
    await waitFor(() => expect(document.getElementById(popup!.id)).toBeNull())

    await expect(inFlightLogoutRequested).toBe(false)

    resolveFirstPut?.(Response.json({ note: "first" }))

    await waitFor(() => expect(resolveSecondPut).toBeDefined())
    await expect(inFlightLogoutRequested).toBe(false)

    resolveSecondPut?.(Response.json({ note: "first second" }))

    await waitFor(() => expect(inFlightLogoutRequested).toBe(true))
    await expect(inFlightRequestOrder).toEqual([
      "PUT:first",
      "PUT:first second",
      "POST:/logout",
    ])
  },
}

let failedFlushLogoutRequested = false

// A note save that fails (or times out) leaves the draft unsaved. Logout
// still proceeds to request /logout once the bounded flush settles, but
// while that request has not actually succeeded yet the draft is not lost:
// the beforeunload guard must stay armed, because the server session (and
// with it any chance to retry the save) is still there.
export const LogoutKeepsGuardWhileLogoutPending: Story = {
  tags: ["!dev"],
  beforeEach: () => {
    const fetch = window.fetch
    failedFlushLogoutRequested = false
    window.fetch = async (input, init) => {
      const url = String(input)
      if (url.endsWith("/me")) {
        return Response.json({
          id: 1,
          email: "ada@example.com",
          first_name: "Ada",
          last_name: "Lovelace",
          avatar_url: null,
        })
      }
      if (url.includes("/api/v1/interests")) {
        return Response.json(DEFAULT_INTEREST)
      }
      if (url.includes("/feed") && !url.endsWith("/note")) {
        return Response.json({ items: [], next_cursor: null })
      }
      if (url.endsWith("feed/501/note") && init?.method === "PUT") {
        return new Response(null, { status: 500 })
      }
      if (url.endsWith("/logout") && init?.method === "POST") {
        failedFlushLogoutRequested = true
        return new Promise<Response>(() => {
          // Never resolves: keeps App from reaching window.location.reload(),
          // which cannot be safely stubbed on window.location in a real
          // browser. Logout is therefore still outstanding (neither
          // succeeded nor failed) for the rest of this story.
        })
      }
      throw new Error(`Unexpected logout story request: ${url}`)
    }
    useVacancyNotesStore.getState().reset()
    useVacancyNotesStore.getState().change(501, "Never saved")

    return () => {
      window.fetch = fetch
      useVacancyNotesStore.getState().reset()
    }
  },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)

    const armedEvent = new Event("beforeunload", { cancelable: true })
    window.dispatchEvent(armedEvent)
    await expect(armedEvent.defaultPrevented).toBe(true)

    const profile = await canvas.findByRole("button", {
      name: "Профіль Ada Lovelace",
    })
    await userEvent.click(profile)
    let popup: HTMLElement | null = null
    await waitFor(() => {
      popup = document.getElementById(
        profile.getAttribute("aria-controls") ?? "",
      )
      expect(popup).toBeVisible()
    })
    const logoutItem = within(popup!).getByRole("menuitem", { name: "Вийти" })
    await userEvent.click(logoutItem)
    await waitFor(() => expect(document.getElementById(popup!.id)).toBeNull())

    await waitFor(() => expect(failedFlushLogoutRequested).toBe(true))

    const stillArmedEvent = new Event("beforeunload", { cancelable: true })
    window.dispatchEvent(stillArmedEvent)
    await expect(stillArmedEvent.defaultPrevented).toBe(true)
    await expect(useVacancyNotesStore.getState().drafts[501]?.value).toBe(
      "Never saved",
    )
  },
}

let failedLogoutRequested = false

// When /logout itself fails (network error, 5xx, CSRF 403) after a note
// save already failed, the user stays signed in on the same page: the
// unsaved draft, its error/retry state and the unload guard must all still
// be there so nothing was silently thrown away for a logout that never
// actually happened.
export const LogoutFailurePreservesUnsavedNote: Story = {
  tags: ["!dev"],
  beforeEach: () => {
    const fetch = window.fetch
    failedLogoutRequested = false
    window.fetch = async (input, init) => {
      const url = String(input)
      if (url.endsWith("/me")) {
        return Response.json({
          id: 1,
          email: "ada@example.com",
          first_name: "Ada",
          last_name: "Lovelace",
          avatar_url: null,
        })
      }
      if (url.includes("/api/v1/interests")) {
        return Response.json(DEFAULT_INTEREST)
      }
      if (url.includes("/feed") && !url.endsWith("/note")) {
        return Response.json({ items: [], next_cursor: null })
      }
      if (url.endsWith("feed/501/note") && init?.method === "PUT") {
        return new Response(null, { status: 500 })
      }
      if (url.endsWith("/logout") && init?.method === "POST") {
        failedLogoutRequested = true
        return new Response(null, { status: 500 })
      }
      throw new Error(`Unexpected logout story request: ${url}`)
    }
    useVacancyNotesStore.getState().reset()
    useVacancyNotesStore.getState().change(501, "Draft that must survive")

    return () => {
      window.fetch = fetch
      useVacancyNotesStore.getState().reset()
    }
  },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)

    const armedEvent = new Event("beforeunload", { cancelable: true })
    window.dispatchEvent(armedEvent)
    await expect(armedEvent.defaultPrevented).toBe(true)

    const profile = await canvas.findByRole("button", {
      name: "Профіль Ada Lovelace",
    })
    await userEvent.click(profile)
    let popup: HTMLElement | null = null
    await waitFor(() => {
      popup = document.getElementById(
        profile.getAttribute("aria-controls") ?? "",
      )
      expect(popup).toBeVisible()
    })
    const logoutItem = within(popup!).getByRole("menuitem", { name: "Вийти" })
    await userEvent.click(logoutItem)
    await waitFor(() => expect(document.getElementById(popup!.id)).toBeNull())

    await waitFor(() => expect(failedLogoutRequested).toBe(true))

    // Logout failed: the menu must fall back out of "logging out" state
    // instead of leaving the user stuck, and the note draft plus its
    // error/retry state and the unload guard must all still be intact.
    await userEvent.click(profile)
    await waitFor(() => {
      popup = document.getElementById(
        profile.getAttribute("aria-controls") ?? "",
      )
      expect(popup).toBeVisible()
    })
    const retryLogoutItem = await within(popup!).findByRole("menuitem", {
      name: "Вийти",
    })
    await expect(retryLogoutItem).not.toHaveAttribute("aria-disabled", "true")

    const draft = useVacancyNotesStore.getState().drafts[501]
    await expect(draft?.value).toBe("Draft that must survive")
    await expect(draft?.status).toBe("error")

    const guardEvent = new Event("beforeunload", { cancelable: true })
    window.dispatchEvent(guardEvent)
    await expect(guardEvent.defaultPrevented).toBe(true)
  },
}

export const InterestsPage: Story = {
  parameters: { initialEntries: ["/interests"] },
  globals: { viewport: { value: "mobile", isRotated: false } },
  beforeEach: () => {
    const fetch = window.fetch
    window.fetch = async (input) => {
      const url = String(input)
      if (url.endsWith("/me")) {
        return Response.json({
          id: 1,
          email: "ada@example.com",
          first_name: "Ada",
          last_name: "Lovelace",
          avatar_url: null,
        })
      }
      if (url.includes("/api/v1/interests")) {
        return Response.json({ items: [], limit: 10 })
      }
      if (url.includes("/api/v1/feed")) {
        return Response.json({ items: [], next_cursor: null })
      }
      return new Response(null, { status: 404 })
    }

    return () => {
      window.fetch = fetch
    }
  },
  play: async ({ canvasElement }) => {
    await expect(window.innerWidth).toBe(390)
    const canvas = within(canvasElement)
    await expect(
      await canvas.findByRole("heading", {
        level: 2,
        name: "Ще немає жодного інтересу",
      }),
    ).toBeVisible()
    await expect(
      within(canvas.getByRole("banner")).getByRole("heading", {
        name: "Інтереси",
      }),
    ).toBeVisible()
    await expect(canvas.queryByRole("button", { name: "Фільтри" })).toBeNull()
    await expect(
      canvas.queryByRole("button", { name: "Налаштувати вигляд" }),
    ).toBeNull()
    await expect(
      canvas.getByRole("banner").querySelector('svg[data-icon="target"]'),
    ).toBeInTheDocument()
  },
}
