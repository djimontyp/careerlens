import type { Meta, StoryObj } from "@storybook/react-vite"
import { MemoryRouter } from "react-router-dom"
import { expect, screen, waitFor, within } from "storybook/test"

import { InterestsPage } from "@/features/interests/components/interests-page"
import type { Interest, Source } from "@/features/interests/api"

const interests: Interest[] = [
  {
    id: 1,
    name: "Python backend",
    keywords: ["python", "django"],
    stop_words: ["senior"],
    sources: [{ code: "dou", name: "DOU", icon_url: null }],
    is_active: true,
    created_at: "2026-09-24T10:00:00Z",
  },
  {
    id: 2,
    name: "Go",
    keywords: ["go", "golang"],
    stop_words: [],
    sources: [],
    is_active: false,
    created_at: "2026-09-23T10:00:00Z",
  },
]

const sources: Source[] = [
  { code: "djinni", name: "Djinni", icon_url: null },
  { code: "dou", name: "DOU", icon_url: null },
]

const CSRF_TOKEN = "story-interests-csrf-token"
const requests: { url: string; init?: RequestInit }[] = []

function stubApi(
  createState: () => { items: Interest[]; limit: number; sources: Source[] },
) {
  return () => {
    // Build the mutable state fresh on every invocation: `beforeEach` runs
    // again each time a story replays (including a manual rerun in the
    // Storybook UI), and a state object shared across replays would still
    // carry a previous run's DELETE/PATCH/POST mutations.
    const state = createState()
    const fetch = window.fetch
    requests.length = 0
    document.cookie = `csrftoken=${CSRF_TOKEN}; path=/`
    window.fetch = async (input, init) => {
      const url = String(input)
      requests.push({ url, init })
      const method = init?.method ?? "GET"
      if (url.includes("/api/v1/sources")) return Response.json(state.sources)
      if (url.match(/\/api\/v1\/interests\/(\d+)$/)) {
        const id = Number(url.match(/(\d+)$/)![1])
        if (method === "DELETE") {
          state.items = state.items.filter((item) => item.id !== id)
          return new Response(null, { status: 204 })
        }
        if (method === "PATCH") {
          const patch = JSON.parse(String(init?.body))
          state.items = state.items.map((item) =>
            item.id === id ? { ...item, ...patch } : item,
          )
          return Response.json(state.items.find((item) => item.id === id))
        }
      }
      if (url.endsWith("/api/v1/interests") && method === "POST") {
        const body = JSON.parse(String(init?.body))
        const created: Interest = {
          id: 99,
          name: body.name || body.keywords.slice(0, 2).join(", "),
          keywords: body.keywords,
          stop_words: body.stop_words,
          sources: state.sources.filter((source) =>
            body.sources.includes(source.code),
          ),
          is_active: true,
          created_at: "2026-09-24T12:00:00Z",
        }
        state.items = [created, ...state.items]
        return Response.json(created, { status: 201 })
      }
      if (url.endsWith("/api/v1/interests"))
        return Response.json({ items: state.items, limit: state.limit })
      return new Response(null, { status: 404 })
    }
    return () => {
      window.fetch = fetch
      document.cookie =
        "csrftoken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    }
  }
}

const meta = {
  title: "Interests/Page",
  component: InterestsPage,
  parameters: { layout: "fullscreen" },
  beforeEach: stubApi(() => ({
    items: structuredClone(interests),
    limit: 10,
    sources,
  })),
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={["/interests"]}>
        <div className="h-svh bg-background">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof InterestsPage>

export default meta
type Story = StoryObj<typeof meta>

export const Loading: Story = {
  beforeEach: () => {
    const fetch = window.fetch
    window.fetch = () => new Promise<Response>(() => undefined)
    return () => (window.fetch = fetch)
  },
  play: async ({ canvasElement }) => {
    const list = within(canvasElement).getByRole("list", {
      name: "Завантаження інтересів",
    })
    await expect(list).toHaveAttribute("aria-busy", "true")
  },
}

export const LoadFailed: Story = {
  beforeEach: () => {
    const fetch = window.fetch
    let calls = 0
    window.fetch = async () => {
      if (calls++ !== 0) {
        await new Promise((resolve) => setTimeout(resolve, 20))
        return Response.json({ items: interests, limit: 10 })
      }
      return new Response(null, { status: 500 })
    }
    return () => (window.fetch = fetch)
  },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Не вдалося завантажити інтереси.",
    )
    await userEvent.click(canvas.getByRole("button", { name: "Повторити" }))
    await expect(
      await canvas.findByRole("list", { name: "Завантаження інтересів" }),
    ).toHaveAttribute("aria-busy", "true")
    await expect(
      await canvas.findByRole("heading", { level: 2, name: "Python backend" }),
    ).toBeVisible()
  },
}

export const Empty: Story = {
  beforeEach: stubApi(() => ({ items: [], limit: 10, sources })),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      await canvas.findByRole("heading", {
        level: 2,
        name: "Ще немає жодного інтересу",
      }),
    ).toBeVisible()
    await expect(
      canvas.getByRole("button", { name: "Створити перший інтерес" }),
    ).toBeEnabled()
    await expect(canvas.getByText("0 із 10")).toBeVisible()
  },
}

export const CreateFirst: Story = {
  beforeEach: () => {
    const fetch = window.fetch
    document.cookie = `csrftoken=${CSRF_TOKEN}; path=/`
    let items: Interest[] = []
    window.fetch = async (input, init) => {
      const url = String(input)
      const method = init?.method ?? "GET"
      if (url.includes("/api/v1/sources")) return Response.json(sources)
      if (url.endsWith("/api/v1/interests") && method === "POST") {
        const body = JSON.parse(String(init?.body))
        const created: Interest = {
          id: 99,
          name: body.name || body.keywords.slice(0, 2).join(", "),
          keywords: body.keywords,
          stop_words: body.stop_words,
          sources: sources.filter((source) =>
            body.sources.includes(source.code),
          ),
          is_active: true,
          created_at: "2026-09-24T12:00:00Z",
        }
        items = [created, ...items]
        return Response.json(created, { status: 201 })
      }
      if (url.endsWith("/api/v1/interests")) {
        // The empty-state CTA unmounts as soon as the list stops being
        // empty, before the exit animation finishes; a slow reload proves
        // focus lands on the header button rather than the vanished CTA.
        await new Promise((resolve) => setTimeout(resolve, 150))
        return Response.json({ items, limit: 10 })
      }
      return new Response(null, { status: 404 })
    }
    return () => {
      window.fetch = fetch
      document.cookie =
        "csrftoken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    }
  },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    await canvas.findByRole("heading", {
      level: 2,
      name: "Ще немає жодного інтересу",
    })
    await userEvent.click(
      canvas.getByRole("button", { name: "Створити перший інтерес" }),
    )

    const dialog = await screen.findByRole("dialog", { name: "Новий інтерес" })
    const form = within(dialog)
    await userEvent.type(form.getByLabelText("Ключові слова"), "python")
    await userEvent.click(form.getByRole("button", { name: "Створити" }))

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    )
    await canvas.findByRole("heading", { level: 2, name: "python" })
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: "Створити інтерес" }),
      ).toHaveFocus(),
    )
  },
}

export const List: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const python = await canvas.findByRole("heading", {
      level: 2,
      name: "Python backend",
    })
    const go = canvas.getByRole("heading", { level: 2, name: "Go" })
    await expect(
      within(python.closest("li")!).getByText("django"),
    ).toBeVisible()
    await expect(
      within(python.closest("li")!).getByText("Стоп-слова: senior"),
    ).toBeVisible()
    await expect(
      within(python.closest("li")!).getByText("Джерела: DOU"),
    ).toBeVisible()
    await expect(within(go.closest("li")!).getByText("На паузі")).toBeVisible()
    await expect(
      within(go.closest("li")!).getByText("Усі джерела"),
    ).toBeVisible()
    await expect(canvas.getByText("2 із 10")).toBeVisible()
    await expect(
      canvas.getByRole("button", { name: "Створити інтерес" }),
    ).toBeEnabled()
  },
}

export const LimitReached: Story = {
  beforeEach: stubApi(() => ({
    items: structuredClone(interests),
    limit: 2,
    sources,
  })),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      await canvas.findByText("Досягнуто ліміт інтересів."),
    ).toBeVisible()
    const create = canvas.getByRole("button", { name: "Створити інтерес" })
    await expect(create).toBeDisabled()
    await expect(create).toHaveAttribute("aria-describedby", "interests-limit")
  },
}

export const Mobile: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
  beforeEach: stubApi(() => ({
    items: [
      ...structuredClone(interests),
      {
        id: 3,
        name: "Довгий токен",
        keywords: ["a".repeat(50)],
        stop_words: ["b".repeat(50)],
        sources: [],
        is_active: true,
        created_at: "2026-09-22T10:00:00Z",
      },
    ],
    limit: 10,
    sources,
  })),
  play: async ({ canvasElement }) => {
    await expect(window.innerWidth).toBe(390)
    const canvas = within(canvasElement)
    await canvas.findByRole("heading", { level: 2, name: "Python backend" })
    const page = canvasElement.querySelector<HTMLElement>(
      '[data-slot="interests-page"]',
    )!
    await waitFor(() =>
      expect(page.scrollWidth).toBeLessThanOrEqual(page.clientWidth),
    )
    const longCard = canvas
      .getByRole("heading", { level: 2, name: "Довгий токен" })
      .closest("li")!
    const stopWords = within(longCard).getByText(/^Стоп-слова: b+$/)
    await waitFor(() =>
      expect(stopWords.scrollWidth).toBeLessThanOrEqual(stopWords.clientWidth),
    )
    const triggers = canvas.getAllByRole("button", { name: /^Дії: / })
    for (const trigger of triggers) {
      const rect = trigger.getBoundingClientRect()
      expect(rect.width).toBeGreaterThanOrEqual(44)
      expect(rect.height).toBeGreaterThanOrEqual(44)
    }
  },
}

export const Dark: Story = {
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByRole("heading", {
      level: 2,
      name: "Python backend",
    })
  },
}

export const Create: Story = {
  beforeEach: stubApi(() => ({
    items: structuredClone(interests),
    limit: 10,
    sources,
  })),
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    await canvas.findByRole("heading", { level: 2, name: "Python backend" })
    await userEvent.click(
      canvas.getByRole("button", { name: "Створити інтерес" }),
    )

    const dialog = await screen.findByRole("dialog", { name: "Новий інтерес" })
    const form = within(dialog)
    await userEvent.type(form.getByLabelText("Назва"), "Backend")
    await userEvent.type(
      form.getByLabelText("Ключові слова"),
      "Python, python, go",
    )
    await userEvent.click(form.getByRole("checkbox", { name: "DOU" }))
    await userEvent.click(form.getByRole("button", { name: "Створити" }))

    await waitFor(() => {
      const created = requests.find(
        (request) =>
          request.url.endsWith("/api/v1/interests") &&
          request.init?.method === "POST",
      )
      expect(created).toBeDefined()
      const headers = new Headers(created!.init!.headers)
      expect(headers.get("X-CSRFToken")).toBe(CSRF_TOKEN)
      expect(headers.get("Content-Type")).toBe("application/json")
      expect(JSON.parse(String(created!.init!.body))).toEqual({
        name: "Backend",
        keywords: ["Python", "go"],
        stop_words: [],
        sources: ["dou"],
      })
    })
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    )
    await canvas.findByRole("heading", { level: 2, name: "Backend" })
    await expect(
      canvas.getByRole("button", { name: "Створити інтерес" }),
    ).toHaveFocus()
  },
}

export const CreateClientValidation: Story = {
  beforeEach: stubApi(() => ({
    items: structuredClone(interests),
    limit: 10,
    sources,
  })),
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    await canvas.findByRole("heading", { level: 2, name: "Python backend" })
    await userEvent.click(
      canvas.getByRole("button", { name: "Створити інтерес" }),
    )
    const dialog = await screen.findByRole("dialog", { name: "Новий інтерес" })
    const form = within(dialog)

    await userEvent.click(form.getByRole("button", { name: "Створити" }))
    await waitFor(() =>
      expect(form.getByText("Вкажіть хоча б одне ключове слово")).toBeVisible(),
    )
    await expect(form.getByLabelText("Ключові слова")).toHaveAttribute(
      "aria-invalid",
      "true",
    )

    await userEvent.type(form.getByLabelText("Ключові слова"), "python")
    await userEvent.type(form.getByLabelText("Стоп-слова"), "Python")
    await userEvent.click(form.getByRole("button", { name: "Створити" }))
    await waitFor(() =>
      expect(
        form.getByText(
          "Слово не може бути водночас ключовим і стоп-словом: Python",
        ),
      ).toBeVisible(),
    )

    await userEvent.clear(form.getByLabelText("Ключові слова"))
    await userEvent.type(form.getByLabelText("Ключові слова"), ".")
    await userEvent.click(form.getByRole("button", { name: "Створити" }))
    await waitFor(() =>
      expect(
        form.getByText("Слово має містити літеру або цифру: ."),
      ).toBeVisible(),
    )

    expect(requests.some((request) => request.init?.method === "POST")).toBe(
      false,
    )
  },
}

export const CreateServerValidation: Story = {
  beforeEach: () => {
    const fetch = window.fetch
    document.cookie = `csrftoken=${CSRF_TOKEN}; path=/`
    window.fetch = async (input, init) => {
      const url = String(input)
      const method = init?.method ?? "GET"
      if (url.includes("/api/v1/sources")) return Response.json(sources)
      if (url.endsWith("/api/v1/interests") && method === "POST") {
        return Response.json(
          {
            detail: [
              {
                type: "value_error",
                loc: ["body", "payload", "keywords"],
                msg: "Value error, x",
                ctx: { error: "x" },
              },
            ],
          },
          { status: 422 },
        )
      }
      if (url.endsWith("/api/v1/interests"))
        return Response.json({ items: interests, limit: 10 })
      return new Response(null, { status: 404 })
    }
    return () => {
      window.fetch = fetch
      document.cookie =
        "csrftoken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    }
  },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    await canvas.findByRole("heading", { level: 2, name: "Python backend" })
    await userEvent.click(
      canvas.getByRole("button", { name: "Створити інтерес" }),
    )
    const dialog = await screen.findByRole("dialog", { name: "Новий інтерес" })
    const form = within(dialog)
    await userEvent.type(form.getByLabelText("Ключові слова"), "python")
    await userEvent.click(form.getByRole("button", { name: "Створити" }))

    await waitFor(() =>
      expect(form.getByText("Перевірте це поле")).toBeVisible(),
    )
    await expect(form.getByLabelText("Ключові слова")).toHaveAttribute(
      "aria-invalid",
      "true",
    )
  },
}

export const CreateServerModelError: Story = {
  beforeEach: () => {
    const fetch = window.fetch
    document.cookie = `csrftoken=${CSRF_TOKEN}; path=/`
    window.fetch = async (input, init) => {
      const url = String(input)
      const method = init?.method ?? "GET"
      if (url.includes("/api/v1/sources")) return Response.json(sources)
      if (url.endsWith("/api/v1/interests") && method === "POST") {
        return Response.json(
          {
            detail: [
              {
                type: "value_error",
                loc: ["body", "payload"],
                msg: "Value error, x",
                ctx: { error: "x" },
              },
            ],
          },
          { status: 422 },
        )
      }
      if (url.endsWith("/api/v1/interests"))
        return Response.json({ items: interests, limit: 10 })
      return new Response(null, { status: 404 })
    }
    return () => {
      window.fetch = fetch
      document.cookie =
        "csrftoken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    }
  },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    await canvas.findByRole("heading", { level: 2, name: "Python backend" })
    await userEvent.click(
      canvas.getByRole("button", { name: "Створити інтерес" }),
    )
    const dialog = await screen.findByRole("dialog", { name: "Новий інтерес" })
    const form = within(dialog)
    await userEvent.type(form.getByLabelText("Ключові слова"), "python")
    await userEvent.click(form.getByRole("button", { name: "Створити" }))

    await waitFor(() =>
      expect(form.getByText("Не вдалося зберегти інтерес.")).toBeVisible(),
    )
    expect(dialog.querySelector('[aria-invalid="true"]')).toBeNull()
  },
}

export const CreateServerValidationSources: Story = {
  beforeEach: () => {
    const fetch = window.fetch
    document.cookie = `csrftoken=${CSRF_TOKEN}; path=/`
    window.fetch = async (input, init) => {
      const url = String(input)
      const method = init?.method ?? "GET"
      if (url.includes("/api/v1/sources")) return Response.json(sources)
      if (url.endsWith("/api/v1/interests") && method === "POST") {
        return Response.json(
          {
            detail: [
              {
                type: "value_error",
                loc: ["body", "payload", "sources"],
                msg: "Value error, Unknown source codes: nope",
                ctx: { error: "Unknown source codes: nope" },
              },
            ],
          },
          { status: 422 },
        )
      }
      if (url.endsWith("/api/v1/interests"))
        return Response.json({ items: interests, limit: 10 })
      return new Response(null, { status: 404 })
    }
    return () => {
      window.fetch = fetch
      document.cookie =
        "csrftoken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    }
  },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    await canvas.findByRole("heading", { level: 2, name: "Python backend" })
    await userEvent.click(
      canvas.getByRole("button", { name: "Створити інтерес" }),
    )
    const dialog = await screen.findByRole("dialog", { name: "Новий інтерес" })
    const form = within(dialog)
    await userEvent.type(form.getByLabelText("Ключові слова"), "python")
    await userEvent.click(form.getByRole("checkbox", { name: "DOU" }))
    await userEvent.click(form.getByRole("button", { name: "Створити" }))

    const error = await waitFor(() => {
      const el = form.getByText(
        "Одне з джерел більше недоступне, оновіть сторінку",
      )
      expect(el).toBeVisible()
      return el
    })

    await waitFor(() => {
      for (const checkbox of form.getAllByRole("checkbox")) {
        expect(checkbox).toHaveAttribute("aria-invalid", "true")
      }
    })

    const fieldset = form.getByRole("group", { name: "Джерела" })
    await waitFor(() => {
      expect(fieldset).toHaveAttribute("data-invalid", "true")
      const describedBy = fieldset.getAttribute("aria-describedby") ?? ""
      expect(describedBy.split(" ")).toContain(error.id)
    })
  },
}

export const CreateLimit: Story = {
  beforeEach: () => {
    const fetch = window.fetch
    document.cookie = `csrftoken=${CSRF_TOKEN}; path=/`
    window.fetch = async (input, init) => {
      const url = String(input)
      const method = init?.method ?? "GET"
      if (url.includes("/api/v1/sources")) return Response.json(sources)
      if (url.endsWith("/api/v1/interests") && method === "POST") {
        return Response.json(
          { detail: "Interest limit reached." },
          { status: 409 },
        )
      }
      if (url.endsWith("/api/v1/interests"))
        return Response.json({ items: interests, limit: 10 })
      return new Response(null, { status: 404 })
    }
    return () => {
      window.fetch = fetch
      document.cookie =
        "csrftoken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    }
  },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    await canvas.findByRole("heading", { level: 2, name: "Python backend" })
    await userEvent.click(
      canvas.getByRole("button", { name: "Створити інтерес" }),
    )
    const dialog = await screen.findByRole("dialog", { name: "Новий інтерес" })
    const form = within(dialog)
    await userEvent.type(form.getByLabelText("Ключові слова"), "python")
    await userEvent.click(form.getByRole("button", { name: "Створити" }))

    await waitFor(() =>
      expect(form.getByText("Досягнуто ліміт інтересів.")).toBeVisible(),
    )
  },
}

export const CreateReachesLimit: Story = {
  beforeEach: () => {
    const fetch = window.fetch
    document.cookie = `csrftoken=${CSRF_TOKEN}; path=/`
    let items = structuredClone(interests)
    window.fetch = async (input, init) => {
      const url = String(input)
      const method = init?.method ?? "GET"
      if (url.includes("/api/v1/sources")) return Response.json(sources)
      if (url.endsWith("/api/v1/interests") && method === "POST") {
        const body = JSON.parse(String(init?.body))
        const created: Interest = {
          id: 99,
          name: body.name || body.keywords.slice(0, 2).join(", "),
          keywords: body.keywords,
          stop_words: body.stop_words,
          sources: sources.filter((source) =>
            body.sources.includes(source.code),
          ),
          is_active: true,
          created_at: "2026-09-24T12:00:00Z",
        }
        items = [created, ...items]
        return Response.json(created, { status: 201 })
      }
      if (url.endsWith("/api/v1/interests")) {
        // The header button becomes disabled the moment the reloaded count
        // reaches the limit; a slow reload proves focus still lands
        // somewhere other than <body> when it can no longer go there.
        await new Promise((resolve) => setTimeout(resolve, 150))
        return Response.json({ items, limit: 3 })
      }
      return new Response(null, { status: 404 })
    }
    return () => {
      window.fetch = fetch
      document.cookie =
        "csrftoken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    }
  },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    await canvas.findByRole("heading", { level: 2, name: "Python backend" })
    await userEvent.click(
      canvas.getByRole("button", { name: "Створити інтерес" }),
    )
    const dialog = await screen.findByRole("dialog", { name: "Новий інтерес" })
    const form = within(dialog)
    await userEvent.type(form.getByLabelText("Ключові слова"), "rust")
    await userEvent.click(form.getByRole("button", { name: "Створити" }))

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    )
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: "Створити інтерес" }),
      ).toBeDisabled(),
    )
    await waitFor(() => expect(canvas.getByText("3 із 3")).toHaveFocus())
  },
}

export const CreateSourcesEmpty: Story = {
  beforeEach: stubApi(() => ({
    items: structuredClone(interests),
    limit: 10,
    sources: [],
  })),
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    await canvas.findByRole("heading", { level: 2, name: "Python backend" })
    await userEvent.click(
      canvas.getByRole("button", { name: "Створити інтерес" }),
    )
    const dialog = await screen.findByRole("dialog", { name: "Новий інтерес" })
    const form = within(dialog)

    await waitFor(() =>
      expect(
        form.getByText("Джерела з’являться після першого імпорту вакансій."),
      ).toBeVisible(),
    )
    expect(form.queryByRole("checkbox")).not.toBeInTheDocument()
  },
}

export const CreateSourcesFailed: Story = {
  beforeEach: () => {
    const fetch = window.fetch
    document.cookie = `csrftoken=${CSRF_TOKEN}; path=/`
    window.fetch = async (input) => {
      const url = String(input)
      if (url.includes("/api/v1/sources"))
        return new Response(null, { status: 500 })
      if (url.endsWith("/api/v1/interests"))
        return Response.json({ items: interests, limit: 10 })
      return new Response(null, { status: 404 })
    }
    return () => {
      window.fetch = fetch
      document.cookie =
        "csrftoken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    }
  },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    await canvas.findByRole("heading", { level: 2, name: "Python backend" })
    await userEvent.click(
      canvas.getByRole("button", { name: "Створити інтерес" }),
    )
    const dialog = await screen.findByRole("dialog", { name: "Новий інтерес" })
    const form = within(dialog)

    await waitFor(() =>
      expect(form.getByText("Не вдалося завантажити джерела.")).toBeVisible(),
    )
    expect(form.queryByRole("checkbox")).not.toBeInTheDocument()
  },
}

export const Edit: Story = {
  beforeEach: stubApi(() => ({
    items: structuredClone(interests),
    limit: 10,
    sources,
  })),
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    await canvas.findByRole("heading", { level: 2, name: "Python backend" })
    const menuTrigger = canvas.getByRole("button", {
      name: "Дії: Python backend",
    })
    await userEvent.click(menuTrigger)
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Редагувати" }),
    )

    const dialog = await screen.findByRole("dialog", {
      name: "Редагувати інтерес",
    })
    const form = within(dialog)
    await expect(form.getByLabelText("Назва")).toHaveValue("Python backend")
    await expect(form.getByLabelText("Ключові слова")).toHaveValue(
      "python, django",
    )

    await userEvent.clear(form.getByLabelText("Назва"))
    await userEvent.type(form.getByLabelText("Назва"), "Backend 2")
    await userEvent.click(form.getByRole("button", { name: "Зберегти" }))

    await waitFor(() => {
      const updated = requests.find(
        (request) =>
          request.url.endsWith("/api/v1/interests/1") &&
          request.init?.method === "PATCH",
      )
      expect(updated).toBeDefined()
      const headers = new Headers(updated!.init!.headers)
      expect(headers.get("X-CSRFToken")).toBe(CSRF_TOKEN)
      expect(headers.get("Content-Type")).toBe("application/json")
      expect(JSON.parse(String(updated!.init!.body))).toEqual({
        name: "Backend 2",
      })
    })
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    )
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: "Дії: Backend 2" }),
      ).toHaveFocus(),
    )
  },
}

export const EditNoChanges: Story = {
  beforeEach: stubApi(() => ({
    items: structuredClone(interests),
    limit: 10,
    sources,
  })),
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    await canvas.findByRole("heading", { level: 2, name: "Python backend" })
    const menuTrigger = canvas.getByRole("button", {
      name: "Дії: Python backend",
    })
    await userEvent.click(menuTrigger)
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Редагувати" }),
    )

    const dialog = await screen.findByRole("dialog", {
      name: "Редагувати інтерес",
    })
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Зберегти" }),
    )

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    )
    expect(
      requests.some(
        (request) =>
          request.url.endsWith("/api/v1/interests/1") &&
          request.init?.method === "PATCH",
      ),
    ).toBe(false)
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  },
}

export const PauseResume: Story = {
  beforeEach: stubApi(() => ({
    items: structuredClone(interests),
    limit: 10,
    sources,
  })),
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    await canvas.findByRole("heading", { level: 2, name: "Python backend" })
    await userEvent.click(
      canvas.getByRole("button", { name: "Дії: Python backend" }),
    )
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Призупинити" }),
    )

    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: "Дії: Python backend" }),
      ).toHaveFocus(),
    )

    // The card re-renders in place after the reload settles, but re-query
    // from the canvas instead of a cached node to stay robust to that.
    const pausedCard = () =>
      canvas
        .getByRole("heading", { level: 2, name: "Python backend" })
        .closest("li")!
    await waitFor(() =>
      expect(within(pausedCard()).getByText("На паузі")).toBeVisible(),
    )

    await userEvent.click(
      canvas.getByRole("button", { name: "Дії: Python backend" }),
    )
    await waitFor(() =>
      expect(screen.getByRole("menuitem", { name: "Відновити" })).toBeVisible(),
    )

    const updated = requests.find(
      (request) =>
        request.url.endsWith("/api/v1/interests/1") &&
        request.init?.method === "PATCH",
    )
    expect(updated).toBeDefined()
    const headers = new Headers(updated!.init!.headers)
    expect(headers.get("X-CSRFToken")).toBe(CSRF_TOKEN)
    expect(headers.get("Content-Type")).toBe("application/json")
    expect(JSON.parse(String(updated!.init!.body))).toEqual({
      is_active: false,
    })
  },
}

export const PauseFailed: Story = {
  beforeEach: () => {
    const fetch = window.fetch
    document.cookie = `csrftoken=${CSRF_TOKEN}; path=/`
    window.fetch = async (input, init) => {
      const url = String(input)
      const method = init?.method ?? "GET"
      if (url.includes("/api/v1/sources")) return Response.json(sources)
      if (url.match(/\/api\/v1\/interests\/\d+$/) && method === "PATCH") {
        return new Response(null, { status: 500 })
      }
      if (url.endsWith("/api/v1/interests"))
        return Response.json({ items: interests, limit: 10 })
      return new Response(null, { status: 404 })
    }
    return () => {
      window.fetch = fetch
      document.cookie =
        "csrftoken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    }
  },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    const heading = await canvas.findByRole("heading", {
      level: 2,
      name: "Python backend",
    })
    const card = heading.closest("li")!
    await userEvent.click(
      canvas.getByRole("button", { name: "Дії: Python backend" }),
    )
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Призупинити" }),
    )

    await waitFor(() =>
      expect(within(card).getByRole("alert")).toHaveTextContent(
        "Не вдалося оновити інтерес.",
      ),
    )
    expect(within(card).queryByText("На паузі")).not.toBeInTheDocument()
    // Let the menu's own exit animation finish before the story ends, so it
    // doesn't leave an in-transition focus guard for the next story's axe
    // pass to trip over.
    await waitFor(() =>
      expect(screen.queryByRole("menu")).not.toBeInTheDocument(),
    )
  },
}

export const Delete: Story = {
  beforeEach: stubApi(() => ({
    items: structuredClone(interests),
    limit: 10,
    sources,
  })),
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    await canvas.findByRole("heading", { level: 2, name: "Python backend" })
    const createButton = canvas.getByRole("button", {
      name: "Створити інтерес",
    })
    await userEvent.click(
      canvas.getByRole("button", { name: "Дії: Python backend" }),
    )
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Видалити" }),
    )

    const dialog = await screen.findByRole("alertdialog", {
      name: "Видалити «Python backend»?",
    })
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Видалити" }),
    )

    await waitFor(() => {
      const deleted = requests.find(
        (request) =>
          request.url.endsWith("/api/v1/interests/1") &&
          request.init?.method === "DELETE",
      )
      expect(deleted).toBeDefined()
      const headers = new Headers(deleted!.init!.headers)
      expect(headers.get("X-CSRFToken")).toBe(CSRF_TOKEN)
    })
    await waitFor(() =>
      expect(
        canvas.queryByRole("heading", { level: 2, name: "Python backend" }),
      ).not.toBeInTheDocument(),
    )
    await waitFor(() => expect(createButton).toHaveFocus())
  },
}

export const DeleteLast: Story = {
  beforeEach: stubApi(() => ({
    items: structuredClone(interests.slice(0, 1)),
    limit: 10,
    sources,
  })),
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    await canvas.findByRole("heading", { level: 2, name: "Python backend" })
    const createButton = canvas.getByRole("button", {
      name: "Створити інтерес",
    })
    await userEvent.click(
      canvas.getByRole("button", { name: "Дії: Python backend" }),
    )
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Видалити" }),
    )

    const dialog = await screen.findByRole("alertdialog", {
      name: "Видалити «Python backend»?",
    })
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Видалити" }),
    )

    await canvas.findByRole("heading", {
      level: 2,
      name: "Ще немає жодного інтересу",
    })
    await waitFor(() => expect(createButton).toHaveFocus())
  },
}

export const DeleteAtLimit: Story = {
  beforeEach: () => {
    const fetch = window.fetch
    document.cookie = `csrftoken=${CSRF_TOKEN}; path=/`
    let items = structuredClone(interests)
    let deleted = false
    window.fetch = async (input, init) => {
      const url = String(input)
      const method = init?.method ?? "GET"
      if (url.includes("/api/v1/sources")) return Response.json(sources)
      if (url.match(/\/api\/v1\/interests\/(\d+)$/) && method === "DELETE") {
        const id = Number(url.match(/(\d+)$/)![1])
        items = items.filter((item) => item.id !== id)
        deleted = true
        return new Response(null, { status: 204 })
      }
      if (url.endsWith("/api/v1/interests")) {
        // The header button only re-enables once the reloaded count drops
        // below the limit; a reload slower than the dialog's exit animation
        // proves focus still lands on it instead of <body>.
        if (deleted) await new Promise((resolve) => setTimeout(resolve, 150))
        return Response.json({ items, limit: 2 })
      }
      return new Response(null, { status: 404 })
    }
    return () => {
      window.fetch = fetch
      document.cookie =
        "csrftoken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    }
  },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    await canvas.findByRole("heading", { level: 2, name: "Python backend" })
    const createButton = canvas.getByRole("button", {
      name: "Створити інтерес",
    })
    await expect(createButton).toBeDisabled()

    await userEvent.click(
      canvas.getByRole("button", { name: "Дії: Python backend" }),
    )
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Видалити" }),
    )

    const dialog = await screen.findByRole("alertdialog", {
      name: "Видалити «Python backend»?",
    })
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Видалити" }),
    )

    await waitFor(() =>
      expect(
        canvas.queryByRole("heading", { level: 2, name: "Python backend" }),
      ).not.toBeInTheDocument(),
    )
    await waitFor(() => expect(createButton).toBeEnabled())
    await waitFor(() => expect(createButton).toHaveFocus())
  },
}

export const DeleteFailed: Story = {
  beforeEach: () => {
    const fetch = window.fetch
    document.cookie = `csrftoken=${CSRF_TOKEN}; path=/`
    window.fetch = async (input, init) => {
      const url = String(input)
      const method = init?.method ?? "GET"
      if (url.includes("/api/v1/sources")) return Response.json(sources)
      if (url.match(/\/api\/v1\/interests\/\d+$/) && method === "DELETE") {
        return new Response(null, { status: 500 })
      }
      if (url.endsWith("/api/v1/interests"))
        return Response.json({ items: interests, limit: 10 })
      return new Response(null, { status: 404 })
    }
    return () => {
      window.fetch = fetch
      document.cookie =
        "csrftoken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    }
  },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    await canvas.findByRole("heading", { level: 2, name: "Python backend" })
    await userEvent.click(
      canvas.getByRole("button", { name: "Дії: Python backend" }),
    )
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Видалити" }),
    )

    const dialog = await screen.findByRole("alertdialog", {
      name: "Видалити «Python backend»?",
    })
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Видалити" }),
    )

    await waitFor(() =>
      expect(
        within(dialog).getByText("Не вдалося видалити інтерес."),
      ).toBeVisible(),
    )
    await expect(screen.getByRole("alertdialog")).toBeInTheDocument()
  },
}

let releaseDeleteCancelledMidRequest = () => undefined as void

export const DeleteCancelledMidRequestDoesNotLeakAlert: Story = {
  beforeEach: () => {
    const fetch = window.fetch
    document.cookie = `csrftoken=${CSRF_TOKEN}; path=/`
    // The play function releases this once it has exercised the in-flight
    // state (disabled Cancel, ineffective Escape), so the response settles
    // only after those assertions ran instead of racing a fixed delay.
    const settleDelete = new Promise<void>((resolve) => {
      releaseDeleteCancelledMidRequest = resolve
    })
    window.fetch = async (input, init) => {
      const url = String(input)
      const method = init?.method ?? "GET"
      if (url.includes("/api/v1/sources")) return Response.json(sources)
      if (url.match(/\/api\/v1\/interests\/1$/) && method === "DELETE") {
        await settleDelete
        return new Response(null, { status: 500 })
      }
      if (url.endsWith("/api/v1/interests"))
        return Response.json({ items: interests, limit: 10 })
      return new Response(null, { status: 404 })
    }
    return () => {
      releaseDeleteCancelledMidRequest()
      window.fetch = fetch
      document.cookie =
        "csrftoken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    }
  },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    await canvas.findByRole("heading", { level: 2, name: "Python backend" })
    await userEvent.click(
      canvas.getByRole("button", { name: "Дії: Python backend" }),
    )
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Видалити" }),
    )

    const dialog = await screen.findByRole("alertdialog", {
      name: "Видалити «Python backend»?",
    })
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Видалити" }),
    )

    // While the delete is in flight, the dialog cannot be dismissed: Cancel
    // is disabled and Escape has no effect. A late failure must therefore
    // always land on the dialog that is still showing this interest.
    const cancel = within(dialog).getByRole("button", { name: "Скасувати" })
    await expect(cancel).toBeDisabled()
    await userEvent.keyboard("{Escape}")
    await expect(screen.getByRole("alertdialog")).toBeInTheDocument()

    releaseDeleteCancelledMidRequest()

    await waitFor(() =>
      expect(
        within(dialog).getByText("Не вдалося видалити інтерес."),
      ).toBeVisible(),
    )

    await expect(cancel).toBeEnabled()
    await userEvent.click(cancel)
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    )

    // Opening delete for a different interest must never show the previous
    // interest's stale failure alert.
    await userEvent.click(canvas.getByRole("button", { name: "Дії: Go" }))
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Видалити" }),
    )
    const secondDialog = await screen.findByRole("alertdialog", {
      name: "Видалити «Go»?",
    })
    expect(
      within(secondDialog).queryByText("Не вдалося видалити інтерес."),
    ).not.toBeInTheDocument()
  },
}

export const DeleteDark: Story = {
  globals: { theme: "dark" },
  beforeEach: stubApi(() => ({
    items: structuredClone(interests),
    limit: 10,
    sources,
  })),
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    await canvas.findByRole("heading", { level: 2, name: "Python backend" })
    await userEvent.click(
      canvas.getByRole("button", { name: "Дії: Python backend" }),
    )
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Видалити" }),
    )

    // Left open so the addon's axe pass checks the destructive button's
    // contrast against the dark-theme --destructive token.
    await screen.findByRole("alertdialog", {
      name: "Видалити «Python backend»?",
    })
  },
}
