import { Edit02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import type {
  VacancyApplication as Application,
  VacancyDetail,
} from "@/features/feed/api"
import { useVacancyApplicationsStore } from "@/features/feed/state/applications"
import {
  formatFullPublicationDate,
  kyivToday,
  MIN_SUBMITTED_AT,
} from "@/features/vacancies/presentation"

const COVER_LETTER_MAX = 4096

export function VacancyApplication({
  vacancy,
  onChange,
}: {
  vacancy: VacancyDetail
  onChange: (application: Application | null) => void
}) {
  const existing = vacancy.application
  const [localDraft, setLocalDraft] = useState<Application>({
    submitted_at: existing?.submitted_at ?? "",
    cover_letter: existing?.cover_letter ?? "",
  })
  const [editing, setEditing] = useState(false)
  const mutation = useVacancyApplicationsStore(
    (state) => state.mutations[vacancy.id],
  )
  const submitMutation = useVacancyApplicationsStore((state) => state.submit)
  const discard = useVacancyApplicationsStore((state) => state.discard)
  const changeDraft = useVacancyApplicationsStore((state) => state.changeDraft)
  const draft =
    mutation?.draft ??
    (editing
      ? localDraft
      : (existing ?? {
          submitted_at: "",
          cover_letter: "",
        }))
  const pending = mutation?.pending ?? false
  const error = mutation?.error
  const showEditor = editing || !existing || Boolean(mutation)

  function change(next: Application) {
    setEditing(true)
    setLocalDraft(next)
    changeDraft(vacancy.id, next)
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const saved = await submitMutation(
      vacancy.id,
      {
        submitted_at: draft.submitted_at || kyivToday(),
        cover_letter: draft.cover_letter,
      },
      onChange,
    )
    if (saved) setEditing(false)
  }

  async function remove() {
    if (await submitMutation(vacancy.id, null, onChange)) {
      setLocalDraft({ submitted_at: "", cover_letter: "" })
      setEditing(false)
    }
  }

  function cancelEditing() {
    setLocalDraft({
      submitted_at: existing?.submitted_at ?? "",
      cover_letter: existing?.cover_letter ?? "",
    })
    discard(vacancy.id)
    setEditing(false)
  }

  return (
    <section className="flex flex-col gap-2" aria-label="Подача">
      <h3 className="text-sm font-medium text-muted-foreground">Подача</h3>
      {existing && !showEditor ? (
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-sm font-medium">
              Подано {formatFullPublicationDate(existing.submitted_at)}
            </p>
            {existing.cover_letter && (
              <details className="text-sm">
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                  Супровідний текст
                </summary>
                <p className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere] text-muted-foreground">
                  {existing.cover_letter}
                </p>
              </details>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              setLocalDraft({
                submitted_at: existing.submitted_at,
                cover_letter: existing.cover_letter,
              })
              setEditing(true)
            }}
            aria-label="Редагувати подачу"
          >
            <HugeiconsIcon icon={Edit02Icon} />
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Дата подачі</span>
            <input
              type="date"
              value={draft.submitted_at}
              min={MIN_SUBMITTED_AT}
              max={kyivToday()}
              disabled={pending}
              onChange={(event) =>
                change({ ...draft, submitted_at: event.target.value })
              }
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Супровідний текст</span>
            <textarea
              value={draft.cover_letter}
              disabled={pending}
              onChange={(event) =>
                change({ ...draft, cover_letter: event.target.value })
              }
              rows={4}
              maxLength={COVER_LETTER_MAX}
              className="max-h-[60vh] resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              placeholder="Короткий опис мотивації…"
            />
          </label>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {existing ? "Зберегти" : "Зафіксувати подачу"}
            </Button>
            {existing && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={cancelEditing}
                disabled={pending}
              >
                Скасувати
              </Button>
            )}
            {existing && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-auto text-destructive"
                onClick={remove}
                disabled={pending}
              >
                Видалити
              </Button>
            )}
          </div>
        </form>
      )}
    </section>
  )
}
