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
