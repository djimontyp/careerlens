import {
  ArrowUpRight01Icon,
  CopyCheckIcon,
  Share08Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import type { VacancyApplication, VacancyDetail } from "@/features/feed/api"
import { VacancyNotesSheet } from "@/features/feed/components/vacancy-notes-sheet"
import { VacancyStateActions } from "@/features/feed/components/vacancy-state-actions"
import { SourceIdentity } from "@/features/vacancies/components/source-identity"

export function VacancyToolbar({
  vacancy,
  variant,
  onStateChange,
  onApplicationChange,
}: {
  vacancy: VacancyDetail
  variant: "quick" | "context"
  onStateChange?: (
    state: Partial<Pick<VacancyDetail, "saved" | "hidden">>,
  ) => void
  onApplicationChange: (application: VacancyApplication | null) => void
}) {
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    try {
      const url = new URL(window.location.href)
      url.searchParams.set("vacancy", String(vacancy.id))
      await navigator.clipboard.writeText(url.toString())
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2_000)
    } catch {
      setCopied(false)
    }
  }

  if (variant === "quick") {
    return (
      <div
        className="flex min-w-0 items-center gap-1"
        role="group"
        aria-label="Швидкі дії вакансії"
      >
        <VacancyStateActions vacancy={vacancy} onStateChange={onStateChange}>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={copyLink}
            aria-label={
              copied ? "Посилання скопійовано" : "Копіювати посилання"
            }
          >
            <HugeiconsIcon icon={copied ? CopyCheckIcon : Share08Icon} />
          </Button>
        </VacancyStateActions>
      </div>
    )
  }

  return (
    <div
      className="flex shrink-0 items-center justify-end gap-1"
      role="group"
      aria-label="Дії з деталями вакансії"
    >
      {vacancy.url && (
        <a
          href={vacancy.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Відкрити на ${vacancy.source.name}`}
          className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium hover:border-state-boundary hover:bg-state-hover focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          <SourceIdentity source={vacancy.source} />
          <HugeiconsIcon
            icon={ArrowUpRight01Icon}
            data-icon="inline-end"
            className="size-3.5 text-muted-foreground"
          />
        </a>
      )}
      <VacancyNotesSheet
        vacancy={vacancy}
        onApplicationChange={onApplicationChange}
      />
    </div>
  )
}
