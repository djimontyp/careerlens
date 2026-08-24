import {
  BookmarkIcon,
  CheckmarkCircle02Icon,
  Edit02Icon,
  EyeOffIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type VacancyStatusIndicatorsProps = {
  hasNote: boolean
  applicationSubmittedAt: string | null
  saved: boolean
  hidden: boolean
}

export function VacancyStatusIndicators({
  hasNote,
  applicationSubmittedAt,
  saved,
  hidden,
}: VacancyStatusIndicatorsProps) {
  const indicators: Array<{
    label: string
    icon: typeof Edit02Icon
    className: string
  }> = []
  if (hasNote)
    indicators.push({
      label: "Моя нотатка",
      icon: Edit02Icon,
      className: "text-emerald-600 dark:text-emerald-400",
    })
  if (applicationSubmittedAt)
    indicators.push({
      label: "Подано",
      icon: CheckmarkCircle02Icon,
      className: "text-emerald-600 dark:text-emerald-400",
    })
  if (saved)
    indicators.push({
      label: "Збережено",
      icon: BookmarkIcon,
      className: "text-amber-600 dark:text-amber-400 [&_svg]:fill-current",
    })
  if (hidden)
    indicators.push({
      label: "Приховано",
      icon: EyeOffIcon,
      className: "text-muted-foreground",
    })

  if (indicators.length === 0) return null

  return (
    <span className="flex shrink-0 items-center gap-1">
      {indicators.map((indicator) => (
        <Tooltip key={indicator.label}>
          <TooltipTrigger
            render={
              <span
                role="img"
                aria-label={indicator.label}
                className={indicator.className}
              />
            }
          >
            <HugeiconsIcon icon={indicator.icon} className="size-4" />
          </TooltipTrigger>
          <TooltipContent>{indicator.label}</TooltipContent>
        </Tooltip>
      ))}
    </span>
  )
}
