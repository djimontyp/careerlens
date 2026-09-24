import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Badge } from "@/components/ui/badge"
import type { VacancyApplication } from "@/features/feed/api"
import { formatFullPublicationDate } from "@/features/vacancies/presentation"

export function ApplicationBadge({
  application,
}: {
  application: VacancyApplication
}) {
  return (
    <Badge
      className="border-emerald-800/20 bg-emerald-700 text-white dark:bg-emerald-300 dark:text-emerald-950"
      title={`Подачу зафіксовано ${formatFullPublicationDate(application.submitted_at)}`}
    >
      <HugeiconsIcon icon={CheckmarkCircle02Icon} data-icon="inline-start" />
      Подано
    </Badge>
  )
}
