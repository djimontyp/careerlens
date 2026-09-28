import type { Meta, StoryObj } from "@storybook/react-vite"
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
