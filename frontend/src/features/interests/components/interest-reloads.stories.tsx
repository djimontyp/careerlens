import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, waitFor } from "storybook/test"

import type { Interest } from "@/features/interests/api"
import { InterestsPage } from "@/features/interests/components/interests-page"

let releaseOlderReload: (() => void) | undefined
let mutations: number[]

const meta = {
  title: "Interests/Reloads",
  component: InterestsPage,
  parameters: { layout: "fullscreen" },
  beforeEach: ({ parameters }) => {
    let items: Interest[] = ["Python", "Go"].map((name, index) => ({
      id: index + 1,
      name,
      keywords: [name.toLowerCase()],
      stop_words: [],
      sources: [],
      is_active: true,
      created_at: "2026-09-24T10:00:00Z",
    }))
    mutations = []
    releaseOlderReload = undefined
    const fetch = window.fetch
    document.cookie = "csrftoken=reload-story; path=/"
    window.fetch = async (input, init) => {
      const url = String(input)
      const id = Number(url.match(/\/api\/v1\/interests\/(\d+)$/)?.[1])
      if (id && init?.method === "PATCH") {
        expect(new Headers(init.headers).get("X-CSRFToken")).toBe(
          "reload-story",
        )
        expect(JSON.parse(String(init.body))).toEqual({ is_active: false })
        mutations.push(id)
        items = items.map((item) =>
          item.id === id ? { ...item, is_active: false } : item,
        )
        return Response.json(items.find((item) => item.id === id))
      }
      if (url.endsWith("/api/v1/interests") && !init?.method) {
        // Snapshot before waiting, just like a response delayed in transit.
        const response = Response.json({ items, limit: 10 })
        if (mutations.length === 1) {
          await new Promise<void>((resolve) => {
            releaseOlderReload = resolve
          })
          if (parameters.staleReloadFails)
            return Response.json({ detail: "Unavailable" }, { status: 500 })
        }
        return response
      }
      return new Response(null, { status: 404 })
    }
    return () => {
      releaseOlderReload?.()
      window.fetch = fetch
      document.cookie =
        "csrftoken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    }
  },
  decorators: [
    (Story) => (
      <div className="h-svh bg-background">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof InterestsPage>
export default meta
type Story = StoryObj<typeof meta>

const pauseBoth: Story["play"] = async ({ canvas, userEvent }) => {
  await userEvent.click(
    await canvas.findByRole("button", { name: "Призупинити: Python" }),
  )
  await waitFor(() => expect(releaseOlderReload).toBeDefined())
  await userEvent.click(canvas.getByRole("button", { name: "Призупинити: Go" }))
  await waitFor(() =>
    expect(canvas.getByRole("button", { name: "Відновити: Go" })).toBeEnabled(),
  )
  releaseOlderReload!()
  // The first action remains busy until its older GET has actually settled.
  await waitFor(() =>
    expect(
      canvas.getByRole("button", { name: "Відновити: Python" }),
    ).toBeEnabled(),
  )
  expect(canvas.getByRole("button", { name: "Відновити: Go" })).toBeEnabled()
  expect(canvas.queryByRole("alert")).not.toBeInTheDocument()
  expect(mutations).toEqual([1, 2])
}

export const OlderSuccessAfterNewerSuccess: Story = { play: pauseBoth }
export const OlderFailureAfterNewerSuccess: Story = {
  parameters: { staleReloadFails: true },
  play: pauseBoth,
}
