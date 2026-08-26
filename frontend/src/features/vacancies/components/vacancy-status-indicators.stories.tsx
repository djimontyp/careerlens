import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect } from "storybook/test"

import { VacancyStatusIndicators } from "@/features/vacancies/components/vacancy-status-indicators"

const meta = {
  title: "Vacancies/VacancyStatusIndicators",
  component: VacancyStatusIndicators,
} satisfies Meta<typeof VacancyStatusIndicators>

export default meta
type Story = StoryObj<typeof meta>

export const AllCombinations: Story = {
  args: {
    hasNote: false,
    applicationSubmittedAt: null,
    saved: false,
    hidden: false,
  },
  render: () => (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 16 }, (_, value) => (
        <section
          key={value}
          aria-label={`Комбінація ${value + 1}`}
          className="flex min-h-11 items-center justify-between rounded-lg border p-3"
        >
          <span className="text-sm text-muted-foreground">{value + 1}</span>
          <VacancyStatusIndicators
            hasNote={Boolean(value & 1)}
            applicationSubmittedAt={value & 2 ? "2026-08-22T09:30:00Z" : null}
            saved={Boolean(value & 4)}
            hidden={Boolean(value & 8)}
          />
        </section>
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole("region")).toHaveLength(16)
    await expect(canvas.getAllByRole("img")).toHaveLength(32)
  },
}
