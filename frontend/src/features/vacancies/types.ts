type MatchEvidenceItem = {
  type: "strong" | "partial" | "gaps" | "unknown"
  label: string
  explanation: string
}

type MatchEvidence = {
  items: MatchEvidenceItem[]
  evidence_coverage: number
}

export type VacancyMatch = {
  score: number
  reason: string
  evidence: MatchEvidence
  precise: boolean
  scored_at: string
}
