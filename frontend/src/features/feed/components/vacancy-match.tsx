import {
  ArrowDown01Icon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  HelpCircleIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import type { VacancyDetail } from "@/features/feed/api"
import { cn } from "@/lib/utils"

const groups = [
  ["strong", "Сильні збіги"],
  ["partial", "Часткові збіги"],
  ["gaps", "Прогалини"],
  ["unknown", "Невідомо"],
] as const

export function VacancyMatch({ vacancy }: { vacancy: VacancyDetail }) {
  const [open, setOpen] = useState(false)
  const match = vacancy.match
  if (!match) return null
  const matchedCount = match.evidence.items.filter(
    (item) => item.type === "strong" || item.type === "partial",
  ).length
  const gapCount = match.evidence.items.filter(
    (item) => item.type === "gaps",
  ).length

  return (
    <Card size="sm" role="region" aria-label="AI-аналіз відповідності">
      <Collapsible
        open={open}
        onOpenChange={setOpen}
        className="flex flex-col gap-3"
      >
        <div className="grid grid-cols-[1fr_auto] items-center px-3">
          <span className="text-xs font-medium text-muted-foreground">
            Аналіз відповідності
          </span>
          <Badge variant="secondary">{match.score}%</Badge>
        </div>
        <div className="flex flex-col gap-3 px-3">
          {match.reason && <p className="text-sm leading-5">{match.reason}</p>}
          <p className="text-xs text-muted-foreground">
            Покриття доказами{" "}
            {Math.round(match.evidence.evidence_coverage * 100)}%
          </p>
          <div
            data-slot="match-compact-summary"
            aria-hidden={open}
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
              open
                ? "grid-rows-[0fr] opacity-0"
                : "grid-rows-[1fr] opacity-100",
            )}
          >
            <div className="flex min-h-0 flex-wrap gap-2 overflow-hidden">
              <Badge variant="outline">
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  data-icon="inline-start"
                  aria-hidden="true"
                  className="text-primary"
                />
                Збіги: {matchedCount}
              </Badge>
              <Badge variant="outline">
                <HugeiconsIcon
                  icon={CancelCircleIcon}
                  data-icon="inline-start"
                  aria-hidden="true"
                  className="text-destructive"
                />
                Прогалини: {gapCount}
              </Badge>
            </div>
          </div>
        </div>
        {match.evidence.items.length > 0 && (
          <>
            <CollapsibleContent className="h-[var(--collapsible-panel-height)] overflow-hidden opacity-100 transition-[height,opacity] duration-200 ease-out motion-reduce:transition-none [&[hidden]:not([hidden='until-found'])]:hidden data-ending-style:h-0 data-ending-style:opacity-0 data-starting-style:h-0 data-starting-style:opacity-0">
              <div className="flex flex-col gap-3 px-3">
                {groups.map(([type, label]) => {
                  const items = match.evidence.items.filter(
                    (item) => item.type === type,
                  )
                  if (!items.length) return null
                  return (
                    <section key={type} className="flex flex-col gap-1">
                      <h3 className="text-xs font-medium text-muted-foreground">
                        {label} ({items.length})
                      </h3>
                      <ul className="flex flex-col gap-1 text-xs">
                        {items.map((item) => (
                          <li
                            key={`${item.label}-${item.explanation}`}
                            className="flex items-start gap-2 [&>svg]:mt-0.5 [&>svg]:size-3.5 [&>svg]:shrink-0"
                          >
                            <HugeiconsIcon
                              icon={
                                item.type === "gaps"
                                  ? CancelCircleIcon
                                  : item.type === "unknown"
                                    ? HelpCircleIcon
                                    : CheckmarkCircle02Icon
                              }
                              aria-hidden="true"
                              className={cn(
                                item.type === "strong" && "text-primary",
                                item.type === "gaps" && "text-destructive",
                                (item.type === "partial" ||
                                  item.type === "unknown") &&
                                  "text-muted-foreground",
                              )}
                            />
                            <span>
                              <span className="font-medium">{item.label}</span>
                              {item.explanation && (
                                <span className="text-muted-foreground">
                                  {" "}
                                  · {item.explanation}
                                </span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )
                })}
              </div>
            </CollapsibleContent>
            <CollapsibleTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className="group mx-3 w-auto justify-between"
                />
              }
            >
              {open ? "Сховати деталі" : "Показати деталі"}
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                data-icon="inline-end"
                aria-hidden="true"
                className="transition-transform duration-200 group-data-panel-open:rotate-180 motion-reduce:transition-none"
              />
            </CollapsibleTrigger>
          </>
        )}
      </Collapsible>
    </Card>
  )
}
