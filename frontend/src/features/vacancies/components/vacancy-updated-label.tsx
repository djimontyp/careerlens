import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type VacancyUpdatedLabelProps = {
  updatedAt: string | null
}

export function VacancyUpdatedLabel({ updatedAt }: VacancyUpdatedLabelProps) {
  if (!updatedAt) return null

  return (
    <Tooltip>
      <TooltipTrigger
        render={<span className="shrink-0 text-muted-foreground" />}
      >
        Оновлено
      </TooltipTrigger>
      <TooltipContent>Джерело оновило цю вакансію</TooltipContent>
    </Tooltip>
  )
}
