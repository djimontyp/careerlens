import { Edit02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import type { VacancyApplication, VacancyDetail } from "@/features/feed/api"
import { VacancyApplication as ApplicationEditor } from "@/features/feed/components/vacancy-application"
import { VacancyNote } from "@/features/feed/components/vacancy-note"
import { useVacancyNotesStore } from "@/features/feed/state/notes"

export function VacancyNotesSheet({
  vacancy,
  onApplicationChange,
}: {
  vacancy: VacancyDetail
  onApplicationChange: (application: VacancyApplication | null) => void
}) {
  const hasContent = Boolean(vacancy.note) || vacancy.application !== null
  const noteFailed = useVacancyNotesStore(
    (state) => state.drafts[vacancy.id]?.status === "error",
  )
  return (
    <Sheet>
      <Button
        variant={hasContent ? "secondary" : "outline"}
        size="sm"
        render={<SheetTrigger />}
        aria-label="Мої нотатки"
      >
        <HugeiconsIcon
          icon={Edit02Icon}
          data-icon="inline-start"
          className={hasContent ? "fill-current" : undefined}
        />
        <span className="hidden @min-[560px]:inline">Мої нотатки</span>
      </Button>
      {noteFailed && (
        <span role="status" className="text-xs text-destructive">
          Нотатку не збережено
        </span>
      )}
      <SheetContent initialFocus={false} className="w-full sm:max-w-2xl!">
        <SheetHeader className="border-b pr-12">
          <SheetTitle>Мої нотатки</SheetTitle>
          <SheetDescription>
            Подача й приватна нотатка до цієї вакансії.
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4">
          <ApplicationEditor
            key={vacancy.id}
            vacancy={vacancy}
            onChange={onApplicationChange}
          />
          <div className="border-t pt-6">
            <VacancyNote key={vacancy.id} vacancy={vacancy} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
