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

export function formatFullPublicationDate(value: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`))
}

// The earliest submitted_at the server accepts; keeps the date picker's
// min aligned with the API's lower bound.
export const MIN_SUBMITTED_AT = "2000-01-01"

// The application-date contract (server validation and the date picker's
// max) is anchored to the Kyiv calendar date, not the viewer's local date,
// so this reads the reference instant through that time zone explicitly
// rather than through the browser's own zone.
export function kyivToday(reference: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Kyiv" }).format(
    reference,
  )
}
