import { Link } from "react-router-dom"

import { buttonVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"

const COPY = {
  none: {
    title: "Ще немає жодного інтересу",
    text: "Додайте перший інтерес, і стрічка покаже вакансії за ним.",
    action: "Створити інтерес",
  },
  paused: {
    title: "Усі інтереси на паузі",
    text: "Відновіть хоча б один, щоб бачити нові вакансії.",
    action: "До інтересів",
  },
} as const

type InterestsCalloutProps = {
  variant: keyof typeof COPY
  compact?: boolean
}

export function InterestsCallout({
  variant,
  compact = false,
}: InterestsCalloutProps) {
  const copy = COPY[variant]
  return (
    <div
      className={cn(
        "space-y-2 text-sm",
        compact ? "border-b px-4 py-3" : "px-4 py-8 text-center",
      )}
    >
      <p className="font-medium">{copy.title}</p>
      {!compact && <p className="text-muted-foreground">{copy.text}</p>}
      <Link
        to="/interests"
        className={buttonVariants({
          variant: compact ? "outline" : "default",
          size: "sm",
        })}
      >
        {copy.action}
      </Link>
    </div>
  )
}
