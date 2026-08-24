export type VacancyMatch = {
  score: number
  reason: string
  evidence: Record<string, unknown>
  precise: boolean
  scored_at: string
}
