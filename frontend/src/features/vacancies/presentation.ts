import type { VacancyMatch } from "@/features/vacancies/types"

export type MatchPresentation = {
  label: string
  tone: "high" | "medium" | "low" | "unknown"
  precise: boolean
}

export function presentMatch(match: VacancyMatch | null): MatchPresentation {
  if (!match) return { label: "Ще не оцінено", tone: "unknown", precise: false }
  if (!match.precise)
    return { label: "Недостатньо даних", tone: "unknown", precise: false }

  return {
    label: `${match.score}% відповідність`,
    tone: match.score >= 70 ? "high" : match.score >= 40 ? "medium" : "low",
    precise: true,
  }
}

export function formatPublicationDate(
  value: string | null,
  today = new Date(),
) {
  if (!value) return "Дата невідома"

  const date = new Date(`${value}T00:00:00`)
  const current = new Date(today)
  current.setHours(0, 0, 0, 0)
  const days = Math.round((current.getTime() - date.getTime()) / 86_400_000)

  if (days <= 0) return "Сьогодні"
  if (days === 1) return "Учора"
  if (days < 7) return `${days} дн. тому`
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "short",
  }).format(date)
}
