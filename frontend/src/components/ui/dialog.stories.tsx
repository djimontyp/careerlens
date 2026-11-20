/// <reference types="@vitest/browser-playwright" />
import type { Meta, StoryObj } from "@storybook/react-vite"
import { cdp } from "vitest/browser"
import { expect, screen, waitFor, within } from "storybook/test"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"

const meta = {
  title: "UI/Dialog",
  component: Dialog,
  globals: { viewport: { value: "shortLandscape", isRotated: false } },
} satisfies Meta<typeof Dialog>
export default meta
type Story = StoryObj<typeof meta>

export const LongContent: Story = {
  render: () => (
    <Dialog open>
      <DialogContent>
        <DialogTitle>Довгий діалог</DialogTitle>
        <DialogDescription>
          Перевірка доступності довгого вмісту.
        </DialogDescription>
        {Array.from({ length: 60 }, (_, index) => (
          <p key={index}>Рядок {index + 1}</p>
        ))}
        <Button>Остання дія</Button>
      </DialogContent>
    </Dialog>
  ),
  play: async () => {
    expect(window.innerHeight).toBe(390)
    const dialog = await screen.findByRole("dialog", { name: "Довгий діалог" })
    await waitFor(() => {
      const rect = dialog.getBoundingClientRect()
      expect(rect.top).toBeGreaterThanOrEqual(15)
      expect(rect.bottom).toBeLessThanOrEqual(window.innerHeight - 15)
      expect(rect.left).toBeGreaterThanOrEqual(15)
      expect(rect.right).toBeLessThanOrEqual(window.innerWidth - 15)
      expect(dialog.scrollHeight).toBeGreaterThan(dialog.clientHeight)
    })
    dialog.scrollTop = dialog.scrollHeight
    const action = within(dialog).getByRole("button", { name: "Остання дія" })
    await waitFor(() =>
      expect(action.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        window.innerHeight - 15,
      ),
    )
  },
}

async function emulateMotion(preference: "reduce" | "no-preference") {
  await cdp().send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: preference }],
  })
}

export const AnimatesByDefault: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  beforeEach: async () => {
    await emulateMotion("no-preference")
  },
  render: () => (
    <Dialog open>
      <DialogContent>
        <DialogTitle>Анімований діалог</DialogTitle>
        <DialogDescription>Відкривається з анімацією.</DialogDescription>
      </DialogContent>
    </Dialog>
  ),
  play: async () => {
    const dialog = await screen.findByRole("dialog", {
      name: "Анімований діалог",
    })
    await expect(getComputedStyle(dialog).animationName).not.toBe("none")
    const overlay = document.querySelector('[data-slot="dialog-overlay"]')!
    await expect(getComputedStyle(overlay).animationName).not.toBe("none")
  },
}

export const ReducedMotion: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  beforeEach: async () => {
    await emulateMotion("reduce")
    return () => emulateMotion("no-preference")
  },
  render: AnimatesByDefault.render,
  play: async () => {
    const dialog = await screen.findByRole("dialog", {
      name: "Анімований діалог",
    })
    await expect(getComputedStyle(dialog).animationName).toBe("none")
    const overlay = document.querySelector('[data-slot="dialog-overlay"]')!
    await expect(getComputedStyle(overlay).animationName).toBe("none")
  },
}

export const LocalizedChrome: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  render: () => (
    <Dialog open>
      <DialogContent>
        <DialogTitle>Діалог із закриттям</DialogTitle>
        <DialogDescription>Службові підписи українською.</DialogDescription>
      </DialogContent>
    </Dialog>
  ),
  play: async () => {
    const dialog = await screen.findByRole("dialog", {
      name: "Діалог із закриттям",
    })
    await expect(
      within(dialog).getByRole("button", { name: "Закрити" }),
    ).toBeInTheDocument()
    await expect(
      within(dialog).queryByRole("button", { name: "Close" }),
    ).toBeNull()
    const title = within(dialog).getByText("Діалог із закриттям")
    await expect(title.className).not.toMatch(/\bcn-/)
    await expect(title.className).toMatch(/\bfont-heading\b/)
  },
}
