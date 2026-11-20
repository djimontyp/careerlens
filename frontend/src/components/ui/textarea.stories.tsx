import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, waitFor } from "storybook/test"

import { Textarea } from "@/components/ui/textarea"

const meta = {
  title: "UI/Textarea",
  component: Textarea,
  parameters: { layout: "padded" },
  globals: { viewport: { value: "mobile", isRotated: false } },
  args: { "aria-label": "Тестове поле" },
} satisfies Meta<typeof Textarea>
export default meta
type Story = StoryObj<typeof meta>

export const ResizeBounds: Story = {
  play: async ({ canvas }) => {
    expect(window.innerWidth).toBe(390)
    const field = canvas.getByRole("textbox", {
      name: "Тестове поле",
    }) as HTMLTextAreaElement
    const before = field.style.cssText
    try {
      field.style.height = "2000px"
      field.style.width = "2000px"
      await waitFor(() => {
        const rect = field.getBoundingClientRect()
        expect(rect.height).toBeLessThanOrEqual(
          Math.min(256, window.innerHeight * 0.4) + 1,
        )
        expect(rect.right).toBeLessThanOrEqual(window.innerWidth)
      })
      expect(getComputedStyle(field).resize).toBe("vertical")
    } finally {
      field.style.cssText = before
    }
  },
}

export const LongContent: Story = {
  args: { defaultValue: "Довгий рядок\n".repeat(80) },
  play: async ({ canvas }) => {
    const field = canvas.getByRole("textbox") as HTMLTextAreaElement
    expect(field.getBoundingClientRect().height).toBeLessThanOrEqual(257)
    expect(field.scrollHeight).toBeGreaterThan(field.clientHeight)
    field.scrollTop = field.scrollHeight
    expect(field.scrollTop).toBeGreaterThan(0)
    expect(field.value).toBe("Довгий рядок\n".repeat(80))
  },
}
