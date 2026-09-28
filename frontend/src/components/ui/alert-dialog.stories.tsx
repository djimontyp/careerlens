/// <reference types="@vitest/browser-playwright" />
import type { Meta, StoryObj } from "@storybook/react-vite"
import { cdp } from "vitest/browser"
import { expect, screen } from "storybook/test"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const meta = {
  title: "UI/AlertDialog",
  component: AlertDialog,
  globals: { viewport: { value: "desktop", isRotated: false } },
  render: () => (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Видалити інтерес?</AlertDialogTitle>
          <AlertDialogDescription>
            Дію не можна скасувати.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Скасувати</AlertDialogCancel>
          <AlertDialogAction>Видалити</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
} satisfies Meta<typeof AlertDialog>
export default meta
type Story = StoryObj<typeof meta>

async function emulateMotion(preference: "reduce" | "no-preference") {
  await cdp().send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: preference }],
  })
}

export const AnimatesByDefault: Story = {
  beforeEach: async () => {
    await emulateMotion("no-preference")
  },
  play: async () => {
    const dialog = await screen.findByRole("alertdialog", {
      name: "Видалити інтерес?",
    })
    await expect(getComputedStyle(dialog).animationName).not.toBe("none")
    const overlay = document.querySelector(
      '[data-slot="alert-dialog-overlay"]',
    )!
    await expect(getComputedStyle(overlay).animationName).not.toBe("none")
  },
}

export const ReducedMotion: Story = {
  beforeEach: async () => {
    await emulateMotion("reduce")
    return () => emulateMotion("no-preference")
  },
  play: async () => {
    const dialog = await screen.findByRole("alertdialog", {
      name: "Видалити інтерес?",
    })
    await expect(getComputedStyle(dialog).animationName).toBe("none")
    const overlay = document.querySelector(
      '[data-slot="alert-dialog-overlay"]',
    )!
    await expect(getComputedStyle(overlay).animationName).toBe("none")
  },
}

export const HeadingFont: Story = {
  play: async () => {
    const title = await screen.findByText("Видалити інтерес?")
    await expect(title.className).not.toMatch(/\bcn-/)
    await expect(title.className).toMatch(/\bfont-heading\b/)
  },
}
