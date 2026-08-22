import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"

import { ThemeToggle } from "@/components/theme-toggle"
import { ThemeProvider } from "@/components/theme-provider"
import { SHELL_STORAGE_KEY, useShellStore } from "@/features/shell/store"

const meta = {
  title: "Components/ThemeProvider",
  component: ThemeToggle,
} satisfies Meta<typeof ThemeToggle>

export default meta
type Story = StoryObj<typeof meta>

export const CurrentTheme: Story = {
  play: async ({ canvasElement, globals }) => {
    const theme =
      globals.theme === "dark" || globals.theme === "system"
        ? globals.theme
        : "light"
    const dark =
      theme === "dark" ||
      (theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    const toggle = await within(canvasElement).findByRole("button", {
      name:
        theme === "dark"
          ? "Темна тема"
          : theme === "system"
            ? "Системна тема"
            : "Світла тема",
    })

    await expect(toggle).toBeVisible()
    if (dark) await expect(document.documentElement).toHaveClass("dark")
    else await expect(document.documentElement).not.toHaveClass("dark")
    await expect(document.documentElement.style.colorScheme).toBe(
      dark ? "dark" : "light",
    )
  },
}

export const LegacyPreferenceMigration: Story = {
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
  beforeEach: async () => {
    localStorage.setItem("careerlens-theme", "dark")
    localStorage.setItem(
      SHELL_STORAGE_KEY,
      JSON.stringify({ state: { sidebarOpen: false }, version: 0 }),
    )
    await useShellStore.persist.rehydrate()

    return () => {
      useShellStore.getState().setTheme("system")
      localStorage.removeItem(SHELL_STORAGE_KEY)
      localStorage.removeItem("careerlens-theme")
    }
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("button", { name: "Темна тема" }),
    ).toBeVisible()
    await expect(localStorage.getItem("careerlens-theme")).toBeNull()
    await expect(
      JSON.parse(localStorage.getItem(SHELL_STORAGE_KEY)!).state.theme,
    ).toBe("dark")
  },
}
