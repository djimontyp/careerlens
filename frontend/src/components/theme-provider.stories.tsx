import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, waitFor, within } from "storybook/test"

import { ThemeToggle } from "@/components/theme-toggle"

const meta = {
  title: "Components/ThemeProvider",
  component: ThemeToggle,
  beforeEach: () => {
    const getItem = Storage.prototype.getItem
    const setItem = Storage.prototype.setItem

    Storage.prototype.getItem = () => {
      throw new DOMException("Storage is unavailable", "SecurityError")
    }
    Storage.prototype.setItem = () => {
      throw new DOMException("Storage is unavailable", "SecurityError")
    }

    return () => {
      Storage.prototype.getItem = getItem
      Storage.prototype.setItem = setItem
    }
  },
} satisfies Meta<typeof ThemeToggle>

export default meta
type Story = StoryObj<typeof meta>

export const StorageUnavailable: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const toggle = await within(canvasElement).findByRole("button", {
      name: "Системна тема",
    })

    document.documentElement.style.colorScheme = "light"
    await userEvent.click(toggle)
    await userEvent.click(toggle)

    await waitFor(() => {
      expect(toggle).toHaveAccessibleName("Темна тема")
      expect(document.documentElement).toHaveClass("dark")
      expect(document.documentElement.style.colorScheme).toBe("dark")
    })
  },
}
